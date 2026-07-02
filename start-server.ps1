# TexGauge - Local Web Server (PowerShell)
# This script starts a simple HTTP server on localhost:8080

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TexGauge - Local Web Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting server on http://localhost:8080" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""
Write-Host "Then open your browser and go to:" -ForegroundColor White
Write-Host "http://localhost:8080/pages/carding.html" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Create HTTP listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()

Write-Host "Server is running! Press Ctrl+C to stop." -ForegroundColor Green
Write-Host ""

try {
    while ($true) {
        # Wait for a request
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        # Get the requested path
        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") {
            $localPath = "/index.html"
        }
        
        # Build full file path
        $filePath = Join-Path $scriptPath $localPath.TrimStart("/")
        
        # Security: prevent directory traversal
        if (-not $filePath.StartsWith($scriptPath)) {
            $response.StatusCode = 403
            $response.Close()
            continue
        }
        
        # Check if file exists
        if (Test-Path $filePath -PathType Leaf) {
            # Determine content type
            $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = switch ($extension) {
                ".html" { "text/html" }
                ".css" { "text/css" }
                ".js" { "application/javascript" }
                ".json" { "application/json" }
                ".png" { "image/png" }
                ".jpg" { "image/jpeg" }
                ".gif" { "image/gif" }
                ".svg" { "image/svg+xml" }
                ".ico" { "image/x-icon" }
                default { "application/octet-stream" }
            }
            
            try {
                # Read and send file
                $content = Get-Content $filePath -Raw -Encoding UTF8
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
                
                $response.ContentType = $contentType
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            } catch {
                Write-Host "Error reading file: $filePath" -ForegroundColor Red
                $response.StatusCode = 500
            }
        } else {
            # File not found
            $response.StatusCode = 404
            $notFoundContent = @"
<!DOCTYPE html>
<html>
<head><title>404 Not Found</title></head>
<body>
    <h1>404 - File Not Found</h1>
    <p>The requested file was not found: $localPath</p>
</body>
</html>
"@
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($notFoundContent)
            $response.ContentType = "text/html"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        
        $response.Close()
    }
} catch {
    Write-Host ""
    Write-Host "Server stopped." -ForegroundColor Yellow
} finally {
    $listener.Stop()
    $listener.Close()
}