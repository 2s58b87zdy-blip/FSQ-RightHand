import { NextResponse } from 'next/server'; import { listUsers } from '../../../../lib/users';
export async function GET(){try{return NextResponse.json((await listUsers(true)).map(({id,name,role,active})=>({id,name,role,active})));}catch(e){return NextResponse.json({error:e.message},{status:500});}}
