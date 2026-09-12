import { HelpCircle } from 'lucide-react';
import './ConfirmDialog.css';

export default function ConfirmDialog({
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Accept',
    cancelText = 'Decline'
}) {
    return (
        <div className="modal-overlay">
            <div className="modal confirm-dialog">
                <HelpCircle size={48} className="confirm-icon" />
                <h3 className="confirm-title">{title}</h3>
                <p className="confirm-message">{message}</p>
                <div className="confirm-actions">
                    <button className="btn btn-secondary" onClick={onCancel}>
                        {cancelText}
                    </button>
                    <button className="btn btn-success" onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
