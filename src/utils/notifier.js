import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

// --- Fancy SweetAlert2 (Popups) ---
export const alert = {
    success: (title, text = '') => {
        Swal.fire({
            icon: 'success',
            title: title,
            text: text,
            showConfirmButton: false,
            timer: 2000,
            iconColor: '#34497e', // Matches your theme
            borderRadius: '15px',
        });
    },
    error: (title, text = 'Something went wrong!') => {
        Swal.fire({
            icon: 'error',
            title: title,
            text: text,
            confirmButtonColor: '#34497e',
        });
    },
    confirm: async (title = 'Are you sure?', text = "You won't be able to revert this!") => {
        const result = await Swal.fire({
            title: title,
            text: text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, delete it!',
            borderRadius: '15px',
        });
        return result.isConfirmed;
    }
};

// --- Fancy React Hot Toast (Small Toasts) ---
export const notify = {
    success: (msg) => toast.success(msg, {
        style: { borderRadius: '10px', background: '#333', color: '#fff' },
        iconTheme: { primary: '#4ade80', secondary: '#fff' }
    }),
    error: (msg) => toast.error(msg, {
        style: { borderRadius: '10px', background: '#333', color: '#fff' }
    }),
    loading: (msg) => toast.loading(msg),
    dismiss: () => toast.dismiss()
};