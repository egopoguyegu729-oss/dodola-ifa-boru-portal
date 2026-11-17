// Import Supabase client from CDN (make sure your HTML also includes the script tag if needed, or use the ES module)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// TODO: Replace these with your actual Supabase Project URL and Anon Key from your Supabase Dashboard
const SUPABASE_URL = 'https://kncbrdmjhfdjwdlqsdgu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LQ08gKnPXwn0XYYnloZgtw_k3IuT4Mj';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Handle User Authentication (Login / Sign Up)
 */
/**
 * Handle User Authentication (Login / Sign Up with Admin Approval Check)
 */
export async function handleAuth(event, type, email, password, fullName = '', role = 'student') {
    event.preventDefault();
    
    if (type === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            alert('Login Failed: ' + error.message);
            return;
        }

        // Check if user profile is approved by admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_approved, role')
            .eq('id', data.user.id)
            .single();

        if (profileError || !profile.is_approved) {
            alert('Your account is pending administrator approval. Please wait for the school admin to approve your access.');
            await supabase.auth.signOut(); // Log them out immediately
            return;
        }

        alert('Login Successful! Redirecting to dashboard...');
        window.location.href = 'dashboard.html';

    } else {
        // Sign Up (Account created with is_approved = false by default)
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    role: role,
                    is_approved: false // Requires your approval
                }
            }
        });

        if (error) {
            alert('Sign Up Failed: ' + error.message);
        } else {
            alert('Account created successfully! Please wait for school administration approval before you can log in.');
            location.reload();
        }
    }
}


/**
 * Fetch Public Announcements for Notice Ticker / Dashboard
 */
export async function fetchAnnouncements() {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching announcements:', error.message);
        return [];
    }
    return data;
}

/**
 * Upload Library Resource File to Supabase Storage & Database
 */
export async function uploadLibraryResource(file, title, description, subject, resourceType, gradeLevel, author) {
    const filePath = `library/${Date.now()}_${file.name}`;
    
    // 1. Upload file to Supabase Storage bucket 'school-storage'
    const { data: storageData, error: storageError } = await supabase.storage
        .from('school-storage')
        .upload(filePath, file);

    if (storageError) {
        alert('File upload failed: ' + storageError.message);
        return;
    }

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
        .from('school-storage')
        .getPublicUrl(filePath);

    // 3. Save metadata to database table 'library_resources'
    const { error: dbError } = await supabase
        .from('library_resources')
        .insert([
            {
                title: title,
                description: description,
                subject: subject,
                resource_type: resourceType,
                grade_level: gradeLevel,
                file_url: publicUrl,
                file_size: `${(file.size / (1024*1024)).toFixed(1)} MB`,
                author: author
            }
        ]);

    if (dbError) {
        alert('Database save failed: ' + dbError.message);
    } else {
        alert('Resource uploaded successfully!');
        location.reload();
    }
}
