
const SUPABASE_CONFIG = {
    url: 'https://nxutbiushtdexnleoclm.supabase.co',
    anonKey: 'sb_publishable_XdSVKq1zALDvwl4icQpjPA_IGj9TO6n'
};

function getSupabaseClient() {
    if (typeof window === 'undefined' || !window.supabase) return null;
    if (SUPABASE_CONFIG.url.indexOf('YOUR-') !== -1) return null; // not configured yet
    if (!window._sbClient) {
        window._sbClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    }
    return window._sbClient;
}