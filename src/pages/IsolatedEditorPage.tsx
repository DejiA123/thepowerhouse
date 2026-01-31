import { useEffect, useState, useRef } from 'react';
import RichTextEditor from '@/components/bible/RichTextEditor';

const IsolatedEditorPage = () => {
    const [content, setContent] = useState('');
    const [isReady, setIsReady] = useState(false);
    const [isEditable, setIsEditable] = useState(false);
    const editorRef = useRef<any>(null);

    // Prevent PWA auto-focus by starting read-only, then enabling interaction
    useEffect(() => {
        if (isReady) {
            const timer = setTimeout(() => setIsEditable(true), 600);
            return () => clearTimeout(timer);
        }
    }, [isReady]);

    // Communicate with parent frame
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Security check: verify origin if needed, but for now we trust the app's own origin
            const { type, payload } = event.data;
            if (type === 'INIT_CONTENT') {
                setContent(payload);
                setIsReady(true);
            }
        };

        window.addEventListener('message', handleMessage);
        // Signal ready
        if (window.parent) {
            window.parent.postMessage({ type: 'EDITOR_MOUNTED' }, '*');
        }

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleChange = (newContent: string) => {
        if (window.parent) {
            window.parent.postMessage({ type: 'CONTENT_UPDATE', payload: newContent }, '*');
        }
    };

    if (!isReady) return <div className="p-4 text-gray-400">Loading editor...</div>;

    return (
        <div className="h-screen w-screen bg-white dark:bg-gray-950 overflow-hidden">
            {/* 
                CRITICAL CSS OVERRIDES FOR IFRAME CONTEXT
                These ensure the editor behaves like a native text area
            */}
            <style>{`
                body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
                .ProseMirror { 
                    height: 100vh !important; 
                    padding: 1rem !important;
                    outline: none !important;
                    -webkit-user-select: text !important;
                    user-select: text !important;
                    touch-action: manipulation !important; 
                }
            `}</style>
            <RichTextEditor
                content={content}
                onChange={handleChange}
                placeholder="Start writing..."
                toolbarPosition="bottom"
                className="h-full"
                autoFocus={false}
                readOnly={!isEditable}
            />
        </div>
    );
};

export default IsolatedEditorPage;
