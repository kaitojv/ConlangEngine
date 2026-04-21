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

            if (e.ctrlKey && e.shiftKey) {
                switch (e.key.toLowerCase()) {
                    case 'f':
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
                    default:
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);
}
