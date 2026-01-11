
import { supabase } from "@/integrations/supabase/client";

export interface Expense {
    id: string;
    item_name: string;
    category: string;
    amount: number;
    status: string;
}

export interface Guest {
    id: string;
    name: string;
    role: string;
    organization: string;
    rsvp_status: string;
    assigned_seat: string;
    personal_assistant?: string;
}

export interface Task {
    id: string;
    unit_name: string;
    task_text: string;
    is_completed: boolean;
    is_immediate: boolean;
    deadline?: string;
}

export interface ProjectTool {
    id: string;
    name: string;
    description: string;
    url: string;
    icon_name: string;
}

export interface ManagementSettings {
    total_budget: number;
    overall_progress: number;
    is_manual_progress: boolean;
    manual_progress: number;
    brief_title: string;
    brief_subtitle: string;
    brief_overview: string;
    strategic_objective: string;
    unit_formation_plan_pastor: string;
    unit_formation_plan_meeting: string;
}

export interface UnitInformation {
    id: string;
    unit_name: string;
    description: string;
    is_existing_unit: boolean;
    unit_type: string;
    full_description: string;
}

export const managementService = {
    // Settings
    async getSettings(): Promise<ManagementSettings> {
        const { data, error } = await (supabase as any)
            .from('project_settings')
            .select('*')
            .eq('id', 'management_team')
            .single();

        if (error) throw error;
        return data as ManagementSettings;
    },

    async updateSettings(settings: Partial<ManagementSettings>) {
        const { error } = await (supabase as any)
            .from('project_settings')
            .update(settings)
            .eq('id', 'management_team');

        if (error) throw error;
    },

    // Expenses
    async getExpenses(): Promise<Expense[]> {
        const { data, error } = await (supabase as any)
            .from('project_expenses')
            .select('*')
            .order('date_added', { ascending: false });

        if (error) throw error;
        return (data || []) as Expense[];
    },

    async addExpense(expense: Omit<Expense, 'id'>) {
        const { data, error } = await (supabase as any)
            .from('project_expenses')
            .insert(expense)
            .select()
            .single();

        if (error) throw error;
        return data as Expense;
    },

    async updateExpense(id: string, updates: Partial<Expense>) {
        const { error } = await (supabase as any)
            .from('project_expenses')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    async deleteExpense(id: string) {
        const { error } = await (supabase as any)
            .from('project_expenses')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Guests
    async getGuests(): Promise<Guest[]> {
        const { data, error } = await (supabase as any)
            .from('project_guests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as Guest[];
    },

    async addGuest(guest: Omit<Guest, 'id'>) {
        const { data, error } = await (supabase as any)
            .from('project_guests')
            .insert(guest)
            .select()
            .single();

        if (error) throw error;
        return data as Guest;
    },

    async updateGuest(id: string, updates: Partial<Guest>) {
        const { error } = await (supabase as any)
            .from('project_guests')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    async deleteGuest(id: string) {
        const { error } = await (supabase as any)
            .from('project_guests')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Tasks
    async getTasks(): Promise<Task[]> {
        const { data, error } = await (supabase as any)
            .from('project_tasks')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return (data || []) as Task[];
    },

    async updateTask(id: string, updates: Partial<Task>) {
        const { error } = await (supabase as any)
            .from('project_tasks')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    async deleteTask(id: string) {
        const { error } = await (supabase as any)
            .from('project_tasks')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async addTask(task: Omit<Task, 'id'>) {
        const { data, error } = await (supabase as any)
            .from('project_tasks')
            .insert(task)
            .select()
            .single();

        if (error) throw error;
        return data as Task;
    },

    // Tools
    async getTools(): Promise<ProjectTool[]> {
        const { data, error } = await (supabase as any)
            .from('project_tools')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return (data || []) as ProjectTool[];
    },

    async addTool(tool: Omit<ProjectTool, 'id'>) {
        const { data, error } = await (supabase as any)
            .from('project_tools')
            .insert(tool)
            .select()
            .single();

        if (error) throw error;
        return data as ProjectTool;
    },

    async deleteTool(id: string) {
        const { error } = await (supabase as any)
            .from('project_tools')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Phases
    async getPhases() {
        const { data, error } = await (supabase as any)
            .from('project_phases')
            .select('*')
            .order('start_date', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    // Unit Information
    async getUnitInformation(): Promise<UnitInformation[]> {
        const { data, error } = await (supabase as any)
            .from('unit_information')
            .select('*')
            .order('unit_type', { ascending: true });

        if (error) throw error;
        return (data || []) as UnitInformation[];
    },

    async updateUnitInformation(id: string, updates: Partial<UnitInformation>) {
        const { error } = await (supabase as any)
            .from('unit_information')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
    },

    async addUnitInformation(unit: Omit<UnitInformation, 'id'>) {
        const { data, error } = await (supabase as any)
            .from('unit_information')
            .insert(unit)
            .select()
            .single();

        if (error) throw error;
        return data as UnitInformation;
    },

    async deleteUnitInformation(id: string) {
        const { error } = await (supabase as any)
            .from('unit_information')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
