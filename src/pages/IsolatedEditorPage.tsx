import { useEffect, useState, useRef } from 'react';
import RichTextEditor from '@/components/bible/RichTextEditor';

const IsolatedEditorPage = () => {
    const [content, setContent] = useState('');
    const [isReady, setIsReady] = useState(false);
    const [isEditable, setIsEditable] = useState(false);

    const editorRef = useRef<any>(null);



    // Prevent PWA auto-focus by starting read-only, then enabling interaction
    useEffect(() => {
        // Aggressively prevent focus stealing during initialization
        const preventFocus = () => {
            if (!isEditable && document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
                window.blur();
            }
        };
        window.addEventListener('focus', preventFocus);

        if (isReady) {
            const timer = setTimeout(() => setIsEditable(true), 600);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('focus', preventFocus);
            };
        }

        return () => window.removeEventListener('focus', preventFocus);
    }, [isReady, isEditable]);

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
        // Signal ready with retry mechanism to ensure parent catches it
        const intervalId = setInterval(() => {
            if (window.parent && !isReady) {
                window.parent.postMessage({ type: 'EDITOR_MOUNTED' }, '*');
            }
        }, 300);

        // Immediate first try
        if (window.parent) {
            window.parent.postMessage({ type: 'EDITOR_MOUNTED' }, '*');
        }

        return () => {
            window.removeEventListener('message', handleMessage);
            clearInterval(intervalId);
        };
    }, [isReady]);

    const handleChange = (newContent: string) => {
        if (window.parent) {
            window.parent.postMessage({ type: 'CONTENT_UPDATE', payload: newContent }, '*');
        }
    };

    if (!isReady) return null;

    return (
        <div
            className="w-screen h-[100dvh] bg-white dark:bg-gray-950 overflow-hidden relative"
        >
            {/* 
                CRITICAL CSS OVERRIDES FOR IFRAME CONTEXT
                These ensure the editor behaves like a native text area
            */}
            <style>{`
                body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
                .ProseMirror { 
                    min-height: 100% !important; 
                    height: auto !important;
                    padding: 1.5rem !important;
                    padding-bottom: 120px !important; /* Space for toolbar */
                    outline: none !important;
                    -webkit-user-select: text !important;
                    user-select: text !important;
                    touch-action: manipulation !important; 
                }
            `}</style>
            {isEditable ? (
                <RichTextEditor
                    content={content}
                    onChange={handleChange}
                    placeholder="Start writing..."
                    toolbarPosition="bottom"
                    className="h-full"
                    autoFocus={false}
                />
            ) : (
                <div className="h-full w-full relative" tabIndex={-1}>
                    {!content && (
                        <div className="absolute top-6 left-10 text-gray-300 pointer-events-none italic text-xl md:text-2xl font-medium z-0">
                            Start writing...
                        </div>
                    )}
                    <div
                        className="h-full w-full p-4 overflow-y-auto prose max-w-none text-gray-900 dark:text-gray-100 text-[16px] [&_p]:my-2 pointer-events-none"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                </div>
            )}
        </div>
    );
};

export default IsolatedEditorPage;
