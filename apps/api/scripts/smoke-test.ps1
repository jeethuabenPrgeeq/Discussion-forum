$base = "http://localhost:4000/api"
$results = New-Object System.Collections.Generic.List[object]
$creator = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$learner = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$smokeEmail = "smoke.test@college.edu"

function Call($session, $method, $path, $body) {
  $params = @{ Method = $method; Uri = "$base$path"; WebSession = $session; ContentType = "application/json" }
  if ($null -ne $body) { $params.Body = ($body | ConvertTo-Json -Depth 10) }
  Invoke-RestMethod @params
}

function Step($name, [scriptblock]$action) {
  try {
    $value = & $action
    $results.Add([pscustomobject]@{ Step = $name; Result = "PASS"; Detail = "" })
    return $value
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    $msg = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
    $results.Add([pscustomobject]@{ Step = $name; Result = "FAIL"; Detail = "$code $msg" })
    return $null
  }
}

function ExpectStatus($name, $expected, [scriptblock]$action) {
  try {
    & $action | Out-Null
    $results.Add([pscustomobject]@{ Step = $name; Result = "FAIL"; Detail = "expected $expected, got 2xx" })
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    $ok = $code -eq $expected
    $results.Add([pscustomobject]@{ Step = $name; Result = $(if ($ok) { "PASS" } else { "FAIL" }); Detail = "status $code" })
  }
}

Step "Creator login" { Call $creator POST "/auth/login" @{ email = "antony.thomas@prgeeq.com"; password = "Creator@123" } } | Out-Null
Step "GET /auth/me" { Call $creator GET "/auth/me" $null } | Out-Null

$forums = Step "GET /forums" { Call $creator GET "/forums" $null }
$forum = $forums | Where-Object { $_.position -eq 4 } | Select-Object -First 1
$fid = $forum.id

$detail = Step "GET /forums/:id (stats)" { Call $creator GET "/forums/$fid" $null }
$topics = Step "GET /forums/:id/topics" { Call $creator GET "/forums/$fid/topics" $null }
$tid = ($topics | Select-Object -First 1).id
Step "GET /topics/:id" { Call $creator GET "/topics/$tid" $null } | Out-Null

$people = Step "GET /forums/:id/people" { Call $creator GET "/forums/$fid/people" $null }
$priya = $people | Where-Object { $_.email -eq "priya.nair@college.edu" } | Select-Object -First 1

$minWords = 100
if ($detail -and $detail.settings.minWords) { $minWords = $detail.settings.minWords }
Step "PUT /forums/:id/settings" { Call $creator PUT "/forums/$fid/settings" @{ settings = @{ minWords = $minWords } } } | Out-Null

Step "PUT /forums/:id/evaluations/:userId" {
  Call $creator PUT "/forums/$fid/evaluations/$($priya.id)" @{
    status = "draft"; grade = 15; data = @{ overallFeedback = "Smoke test draft"; postMarks = @{} }
  }
} | Out-Null
Step "GET /forums/:id/evaluations" { Call $creator GET "/forums/$fid/evaluations" $null } | Out-Null

$added = Step "POST /forums/:id/people (add)" {
  Call $creator POST "/forums/$fid/people" @{ firstName = "Smoke"; lastName = "Test"; email = $smokeEmail; role = "learner"; group = "A" }
}
$smokeId = $added.id
if (-not $smokeId) {
  $smokeId = ((Call $creator GET "/forums/$fid/people" $null) | Where-Object { $_.email -eq $smokeEmail }).id
}

Step "POST /people/bulk (update)" {
  $r = Call $creator POST "/forums/$fid/people/bulk" @{ rows = @(@{ action = "update"; email = $smokeEmail; group = "B" }) }
  if ($r.updated -ne 1) { throw "updated=$($r.updated) errors=$($r.errors -join '; ')" }
} | Out-Null

Step "PATCH /people/:userId" { Call $creator PATCH "/forums/$fid/people/$smokeId" @{ canPost = $true } } | Out-Null
Step "POST /people/:userId/reminders" {
  Call $creator POST "/forums/$fid/people/$smokeId/reminders" @{ reason = "Not started"; when = "now"; message = "Smoke test reminder"; email = $true; inApp = $true }
} | Out-Null
Step "POST /people/:userId/messages" {
  Call $creator POST "/forums/$fid/people/$smokeId/messages" @{ subject = "Smoke test"; body = "Smoke test message"; email = $true; allowReply = $true }
} | Out-Null

Step "POST /people/bulk (remove)" {
  $r = Call $creator POST "/forums/$fid/people/bulk" @{ rows = @(@{ action = "remove"; email = $smokeEmail }) }
  if ($r.removed -ne 1) { throw "removed=$($r.removed) errors=$($r.errors -join '; ')" }
} | Out-Null

Step "GET /forums/:id/reports" { Call $creator GET "/forums/$fid/reports" $null } | Out-Null
Step "Creator logout" { Call $creator POST "/auth/logout" $null } | Out-Null

Step "Learner login" { Call $learner POST "/auth/login" @{ email = "priya.nair@college.edu"; password = "Learner@123" } } | Out-Null
Step "Learner GET /forums" { Call $learner GET "/forums" $null } | Out-Null
Step "Learner GET own evaluations" { Call $learner GET "/forums/$fid/evaluations" $null } | Out-Null
ExpectStatus "Learner blocked from people (403)" 403 { Call $learner GET "/forums/$fid/people" $null }
ExpectStatus "Learner blocked from settings (403)" 403 { Call $learner PUT "/forums/$fid/settings" @{ settings = @{ minWords = 1 } } }

$results | Format-Table -AutoSize
"{0} passed, {1} failed" -f ($results | Where-Object Result -eq "PASS").Count, ($results | Where-Object Result -eq "FAIL").Count