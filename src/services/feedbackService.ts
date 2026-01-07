import { supabase } from '@/integrations/supabase/client';
import emailjs from '@emailjs/browser';

export interface FeedbackData {
    enjoyed_most: string;
    want_more_of: string;
    didnt_work_well: string;
    suggestions: string;
    concerns: string;
}

export class FeedbackService {
    static async submitFeedback(data: FeedbackData): Promise<{ error: Error | null }> {
        try {
            // Save to database - cast to 'any' to bypass type mismatch
            const { error: dbError } = await (supabase
                .from('service_feedback') as any)
                .insert([data]);

            if (dbError) {
                return { error: dbError };
            }

            // Send email notification using EmailJS
            try {
                await emailjs.send(
                    'service_s2gc7be', // EmailJS Service ID
                    'template_aal7nr7', // EmailJS Template ID
                    {
                        enjoyed_most: data.enjoyed_most || 'N/A',
                        want_more_of: data.want_more_of || 'N/A',
                        didnt_work_well: data.didnt_work_well || 'N/A',
                        suggestions: data.suggestions || 'N/A',
                        concerns: data.concerns || 'N/A',
                    },
                    '0G20ssYtW-cYDF4xt' // EmailJS Public Key
                );

                console.log('Email sent successfully!');
            } catch (emailError) {
                console.error('Error sending email:', emailError);
                // Don't fail the whole operation if email fails
            }

            return { error: null };
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return { error: error as any };
        }
    }
}
