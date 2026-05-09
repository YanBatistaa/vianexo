param(
  [string]$Target = ".",
  [switch]$VerboseReport
)

$argsList = @("-y", "react-doctor@latest", $Target, "--offline", "--fail-on", "none")

if ($VerboseReport) {
  $argsList += "--verbose"
} else {
  $argsList += "--json"
}

npx.cmd @argsList
