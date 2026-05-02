const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function createAdmin() {
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@gmail.com',
    password: 'bibigul123456',
    options: {
      data: {
        full_name: 'Bibigul Tulekova',
        role: 'admin'
      }
    }
  });

  if (error) {
    console.error('Error creating user:', error);
  } else {
    console.log('Successfully created admin user:', data.user?.email);
  }
}

createAdmin();
