Write-Host "🚀 Starting setup for Lyrics R2 Image Upload..." -ForegroundColor Cyan

# Secrets
$R2_ENDPOINT = "https://fd8da334e22fd77aac270568eec810bc.r2.cloudflarestorage.com"
$R2_ACCESS_KEY_ID = "ae64939fb6145a80460e8bb217bcee76"
$R2_SECRET_ACCESS_KEY = "0ccb58ced132df3b20d8523e1c990ef7f9efd810a538c179e910066d5c72029d"
$R2_BUCKET_NAME = "media"
$R2_PUBLIC_DOMAIN = "https://pub-e59dafe72724404d8ae7af425d1dfbdc.r2.dev"

Write-Host "🔐 Setting Supabase secrets..." -ForegroundColor Yellow
# We use cmd /c to ensure npx runs correctly in PowerShell scripts if npx is a batch file
cmd /c npx supabase secrets set R2_ENDPOINT=$R2_ENDPOINT R2_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY R2_BUCKET_NAME=$R2_BUCKET_NAME R2_PUBLIC_DOMAIN=$R2_PUBLIC_DOMAIN

Write-Host "📦 Deploying get-r2-upload-url function..." -ForegroundColor Yellow
cmd /c npx supabase functions deploy get-r2-upload-url --project-ref swjzhzmhqyvwfwevijja

Write-Host "✅ Setup complete! You can now upload lyrics images in the Choir Portal." -ForegroundColor Green
