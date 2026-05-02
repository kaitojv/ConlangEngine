import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export function useGlobalHotkeys() {
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Avoid triggering hotkeys if the user is typing in an input or textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }

            // Navigation hotkeys (Alt + Key)
            if (e.altKey && !e.ctrlKey) {
                switch (e.key.toLowerCase()) {
                    case 'd':
                        e.preventDefault();
                        navigate('/dictionary');
                        toast.success("Opened Dictionary", { id: 'hotkey-nav' });
                        break;
                    case 'a':
                        e.preventDefault();
                        navigate('/create');
                        toast.success("Opened Create Word", { id: 'hotkey-nav' });
                        break;
                    case 'g':
                        e.preventDefault();
                        navigate('/generator');
                        toast.success("Opened Generator", { id: 'hotkey-nav' });
                        break;
                    case 'h':
                        e.preventDefault();
                        navigate('/');
                        toast.success("Opened Home", { id: 'hotkey-nav' });
                        break;
                    case 's':
                        e.preventDefault();
                        navigate('/settings');
                        toast.success("Opened Settings", { id: 'hotkey-nav' });
                        break;
                    default:
                        break;
                }
            }

            // Action hotkeys (Ctrl + Key)
            if (e.ctrlKey && e.key.toLowerCase() === 's') {
                // If there's a global save function, we could trigger it here
                // For now, let's just show a tip that it's auto-saved or triggers backup
                // e.preventDefault();
                // toast.success("Project Saved", { id: 'hotkey-save' });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);
}
