import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient';
import Card from '../../UI/Card/Card.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import Input from '../../UI/Input/Input.jsx';
import { KeyRound } from 'lucide-react';

export default function UpdatePassword() {
    const [newPassword, setNewPassword] = useState('');
    const [status, setStatus] = useState({ msg: '', type: '' });
    const navigate = useNavigate();

    // Verify that the user arrived here with a valid recovery session
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setStatus({ msg: '❌ Invalid or expired reset link. Please request a new one.', type: 'err' });
            }
        });
    }, []);

    const handleUpdate = async () => {
        if (!newPassword || newPassword.length < 6) {
            setStatus({ msg: '❌ Password must be at least 6 characters long.', type: 'err' });
            return;
        }

        setStatus({ msg: '⏳ Updating password...', type: 'tx2' });
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;
            
            setStatus({ msg: '✅ Password updated successfully! Redirecting...', type: 'ok' });
            setTimeout(() => {
                navigate('/profile');
            }, 2000);

        } catch (error) {
            setStatus({ msg: `❌ Error: ${error.message}`, type: 'err' });
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 20px' }}>
            <Card style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', color: 'var(--acc)' }}>
                    <KeyRound size={48} />
                </div>
                <h2 style={{ marginBottom: '10px', color: 'var(--tx)' }}>Update Password</h2>
                <p style={{ marginBottom: '20px', color: 'var(--tx2)', fontSize: '0.9rem' }}>
                    Enter your new password below.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <Input 
                        type="password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        placeholder="New Password" 
                    />
                    
                    <Button variant="imp" onClick={handleUpdate}>
                        Update Password
                    </Button>
                </div>

                {status.msg && (
                    <div style={{ 
                        marginTop: '20px', 
                        padding: '10px', 
                        borderRadius: '6px',
                        background: 'var(--s2)',
                        color: status.type === 'err' ? 'var(--err)' : (status.type === 'ok' ? 'var(--acc2)' : 'var(--tx2)')
                    }}>
                        {status.msg}
                    </div>
                )}
            </Card>
        </div>
    );
}
