import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Helper para comparar arrays
function arraysEqual(a: any[], b: any[]) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  const sortedA = [...a].sort();
  const sortedB = [...b].sort();

  for (let i = 0; i < sortedA.length; ++i) {
    if (sortedA[i] !== sortedB[i]) return false;
  }
  return true;
}

export async function POST(request: Request) {
  const { token } = await request.json()
  const supabase = await createClient()
  
  // Cliente con permisos de superadmin para operaciones de sistema
  // Nota: Asegúrate de tener SUPABASE_SERVICE_ROLE_KEY en tu .env.local
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: token,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  const user = data.user
  if (user) {
    // 1. Check Whitelist (Usando Admin Client para asegurar lectura)
    const { data: whitelistedUser, error: whitelistError } = await supabaseAdmin
        .from('whitelist')
        .select('roles, first_name, last_name, dni, birth_date, phone')
        .eq('email', user.email)
        .single()
    
    console.log('[AUTH] Login attempt:', user.email);

    // If user is not in whitelist
    if (whitelistError || !whitelistedUser) {
        console.error('[AUTH] Whitelist error or not found:', whitelistError);
        await supabase.auth.signOut()
        return NextResponse.json({ error: 'unauthorized_whitelist' }, { status: 403 })
    }

    console.log('[AUTH] Whitelisted roles:', whitelistedUser.roles);

    // 2. Sync Profile Roles (Usando Admin Client para asegurar escritura)
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single()
    
    // Default to 'user' if no roles found (though migration sets default)
    // Fix: Handle empty array [] by defaulting to ['estudiante']
    const userRoles = (whitelistedUser.roles && whitelistedUser.roles.length > 0) 
                      ? whitelistedUser.roles 
                      : ['estudiante'];
    
    console.log('[AUTH] Calculated userRoles:', userRoles);

    const profileData = {
        roles: userRoles,
        first_name: whitelistedUser.first_name,
        last_name: whitelistedUser.last_name,
        dni: whitelistedUser.dni,
        birth_date: whitelistedUser.birth_date,
        phone: whitelistedUser.phone
    };

    if (!profile) {
        const { error: insertError } = await supabaseAdmin.from('profiles').insert({
            id: user.id,
            email: user.email,
            ...profileData
        })
        if (insertError) {
            console.error('[AUTH] Failed to insert profile:', insertError)
        } else {
            console.log('[AUTH] Profile inserted successfully')
        }
    } else {
            // Update profile with latest data from whitelist
            const { error: updateError } = await supabaseAdmin.from('profiles').update(profileData).eq('id', user.id)
            
            if (updateError) {
                console.error('[AUTH] Failed to update profile:', updateError)
            } else {
                console.log('[AUTH] Profile updated successfully')
            }
    }

    // 3. Final Role Check (Must have at least one valid role)
    if (!userRoles || userRoles.length === 0) {
            console.error('[AUTH] Final role check failed: No roles assigned');
            await supabase.auth.signOut()
            return NextResponse.json({ error: 'unauthorized_role' }, { status: 403 })
    }
  }

  return NextResponse.json({ success: true })
}
