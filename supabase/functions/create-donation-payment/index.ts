import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const donationSchema = z.object({
  amount: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format")
    .refine((val) => {
      const num = parseFloat(val);
      return num >= 1 && num <= 1000000;
    }, "Amount must be between €1 and €1,000,000"),
  donationType: z.enum(['tithe', 'offering', 'firstfruits', 'building', 'missions'], {
    errorMap: () => ({ message: "Invalid donation type" })
  }),
  paymentMethod: z.enum(['card', 'bank_transfer', 'paypal'], {
    errorMap: () => ({ message: "Invalid payment method" })
  }),
  testimony: z.string()
    .max(1000, "Testimony must be less than 1000 characters")
    .optional()
    .or(z.literal(''))
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Get and validate request data
    const body = await req.json();
    const validationResult = donationSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validation failed: ${errors}`);
    }
    
    const { amount, donationType, paymentMethod, testimony } = validationResult.data;

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Map donation types to display names
    const donationDisplayNames = {
      tithe: "Tithe",
      offering: "Offering", 
      firstfruits: "First Fruits",
      building: "Building Fund",
      missions: "Missions"
    };

    // Create a one-time payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { 
              name: `${donationDisplayNames[donationType as keyof typeof donationDisplayNames]} - The Power House International`,
              description: testimony ? `Testimony: ${testimony.substring(0, 100)}...` : `${donationDisplayNames[donationType as keyof typeof donationDisplayNames]} donation`
            },
            unit_amount: Math.round(parseFloat(amount) * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/give?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/give?canceled=true`,
      metadata: {
        user_id: user.id,
        donation_type: donationType,
        payment_method: paymentMethod,
        testimony: testimony || ""
      }
    });

    // Create a pending donation record in Supabase
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseService.from("donations").insert({
      user_id: user.id,
      amount: parseFloat(amount),
      currency: "EUR",
      donation_type: donationType,
      payment_method: paymentMethod,
      payment_intent_id: session.id,
      status: "pending",
      testimony: testimony || null,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});