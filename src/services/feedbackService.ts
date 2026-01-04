import { supabase } from '@/integrations/supabase/client';

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
            // Save to database
            const { error: dbError } = await supabase
                .from('service_feedback')
                .insert([data]);

            if (dbError) {
                return { error: dbError };
            }

            // Send email notification
            try {
                const { error: emailError } = await supabase.functions.invoke('send-feedback-email', {
                    body: data
                });

                if (emailError) {
                    console.error('Failed to send email notification:', emailError);
                    // Don't fail the whole operation if email fails
                }
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
