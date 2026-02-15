import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.540.0?target=deno"
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.540.0?target=deno"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log(`Received ${req.method} request to get-r2-upload-url`);

        // Extract body
        const { fileName, fileType } = await req.json()
        if (!fileName || !fileType) {
            throw new Error("fileName and fileType are required in the request body");
        }

        // Validate Environment Variables
        const endpoint = Deno.env.get("R2_ENDPOINT");
        const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
        const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
        const bucketName = Deno.env.get("R2_BUCKET_NAME");
        const publicDomain = Deno.env.get("R2_PUBLIC_DOMAIN");

        if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName || !publicDomain) {
            const missing = [
                !endpoint && "R2_ENDPOINT",
                !accessKeyId && "R2_ACCESS_KEY_ID",
                !secretAccessKey && "R2_SECRET_ACCESS_KEY",
                !bucketName && "R2_BUCKET_NAME",
                !publicDomain && "R2_PUBLIC_DOMAIN"
            ].filter(Boolean);
            throw new Error(`Missing environment variables: ${missing.join(", ")}`);
        }

        const s3Client = new S3Client({
            region: "auto",
            endpoint: endpoint,
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
            },
        })

        const key = `lyrics/${Date.now()}_${fileName}`

        console.log(`Generating presigned URL for key: ${key}`);

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: fileType,
        })

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
        const publicUrl = `${publicDomain}/${key}`

        return new Response(
            JSON.stringify({ uploadUrl, publicUrl, key }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error("Error in get-r2-upload-url function:", error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
