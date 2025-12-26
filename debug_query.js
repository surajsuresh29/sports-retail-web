
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://srknxkkympnmwuuxgwhf.supabase.co'
const supabaseKey = 'sb_publishable_M1eYiIyNoUj3foT589pB4A_3iOhDm0i' // From .env

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQuery() {
    console.log("Testing query...")
    const { data, error } = await supabase
        .from('transactions')
        .select('*, product:products(name), from_location:from_location_id(name), to_location:to_location_id(name)')
        .order('created_at', { ascending: false })
        .limit(5)

    if (error) {
        console.error("Query Error:", error)
    } else {
        console.log("Query Success. Data length:", data.length)
        console.log(JSON.stringify(data, null, 2))
    }
}

testQuery()
