import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3"
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { fileName, fileType } = await req.json()

        const s3Client = new S3Client({
            region: "auto",
            endpoint: Deno.env.get("R2_ENDPOINT")!,
            credentials: {
                accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
                secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
            },
        })

        const bucketName = Deno.env.get("R2_BUCKET_NAME")!
        const key = `uploads/${Date.now()}_${fileName}`

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: fileType,
        })

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
        const publicUrl = `${Deno.env.get("R2_PUBLIC_DOMAIN")}/${key}`

        return new Response(
            JSON.stringify({ uploadUrl, publicUrl, key }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
