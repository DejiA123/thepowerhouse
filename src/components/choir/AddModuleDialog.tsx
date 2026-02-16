import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextEditor from "@/components/bible/RichTextEditor";
import { choirService, AcademyModule } from "@/services/choirService";
import { toast } from "sonner"; // Assuming sonner is used for toasts

interface AddModuleDialogProps {
    isOpen: boolean;
    onClose: () => void;
    locationId: string;
}

export const AddModuleDialog = ({ isOpen, onClose, locationId }: AddModuleDialogProps) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [content, setContent] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [category, setCategory] = useState<'newcomer' | 'core'>("newcomer");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!title.trim()) {
            toast.error("Please enter a title");
            return;
        }

        setIsSubmitting(true);
        try {
            await choirService.addAcademyModule({
                title,
                description,
                content,
                video_url: videoUrl,
                category,
                location: locationId
            });

            onClose();
            // Reset form
            setTitle("");
            setDescription("");
            setContent("");
            setVideoUrl("");
            setCategory("newcomer");
        } catch (error) {
            console.error("Failed to create module", error);
            toast.error("Failed to create module");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col p-0 bg-white dark:bg-slate-900 overflow-hidden [&>button]:!top-[calc(3rem+env(safe-area-inset-top,0px))] [&>button]:!right-6">
                <DialogHeader className="p-6 pt-[calc(3rem+env(safe-area-inset-top,0px))] border-b border-slate-100 dark:border-slate-800">
                    <DialogTitle className="text-2xl font-bold">Create New Teaching</DialogTitle>
                    <DialogDescription>Add a new lesson to the Academy curriculum.</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                placeholder="e.g. The Heart of Worship"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="text-lg font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newcomer">Newcomers Path</SelectItem>
                                    <SelectItem value="core">Core Training</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Short Description</Label>
                        <Input
                            placeholder="Brief summary of what this lesson covers..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Video URL (Optional)</Label>
                        <Input
                            placeholder="https://youtube.com/..."
                            value={videoUrl}
                            onChange={e => setVideoUrl(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2 flex-1 flex flex-col min-h-[400px]">
                        <Label>Lesson Content</Label>
                        <div className="flex-1 border rounded-xl overflow-hidden shadow-sm">
                            <RichTextEditor
                                content={content}
                                onChange={setContent}
                                placeholder="Write the teaching content here..."
                                toolbarPosition="bottom"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="max-w-4xl mx-auto w-full flex justify-end gap-3">
                        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim()} className="min-w-[150px]">
                            {isSubmitting ? "Creating..." : "Create Application"} {/* Application? typo :D "Create Teaching" or "Publish" */}
                            Create Teaching
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
