import { supabase } from "@/integrations/supabase/client";

export interface FollowUpAssignment {
    id: string;
    visitor_name: string;
    visit_date: string;
    phone_number: string;
    invited_by: string;
    assigned_to: string;
    notes: string;
    status: string;
    created_at: string;
}

export const followUpService = {
    // Get all follow ups
    async getAllFollowUps() {
        const { data, error } = await supabase
            .from('team_follow_ups' as any)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as unknown as FollowUpAssignment[];
    },

    // Get unique "assigned_to" names
    async getTeamMembers() {
        const { data, error } = await supabase
            .from('team_follow_ups' as any)
            .select('assigned_to');

        if (error) throw error;

        // Return unique names
        const names = Array.from(new Set((data as any[]).map(d => d.assigned_to)));
        return names.sort();
    },

    // Get assignments for a specific person
    async getAssignmentsFor(name: string) {
        // Reverend David can see everyone's assignments
        if (name === 'Reverend David') {
            return this.getAllFollowUps();
        }

        const { data, error } = await supabase
            .from('team_follow_ups' as any)
            .select('*')
            .eq('assigned_to', name)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as unknown as FollowUpAssignment[];
    },

    async updateNote(id: string, notes: string) {
        const { error } = await supabase
            .from('team_follow_ups' as any)
            .update({ notes })
            .eq('id', id);

        if (error) throw error;
    },

    async createAssignment(assignment: Partial<FollowUpAssignment>) {
        // Sanitize data: remove empty strings for dates
        const payload = {
            ...assignment,
            visit_date: assignment.visit_date === "" ? null : assignment.visit_date
        };

        const { data, error } = await supabase
            .from('team_follow_ups' as any)
            .insert([payload])
            .select()
            .single();

        if (error) throw error;
        return data as unknown as FollowUpAssignment;
    },

    async updateAssignment(id: string, updates: Partial<FollowUpAssignment>) {
        // Sanitize data
        const payload = {
            ...updates,
            visit_date: updates.visit_date === "" ? null : updates.visit_date
        };

        const { data, error } = await supabase
            .from('team_follow_ups' as any)
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as unknown as FollowUpAssignment;
    },

    async deleteAssignment(id: string) {
        const { error } = await supabase
            .from('team_follow_ups' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
