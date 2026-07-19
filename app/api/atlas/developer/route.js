import { readSession } from '../../../../lib/auth';
import { isFlemming } from '../../../../lib/atlas';
export const runtime='nodejs';
export async function GET(){const session=await readSession();if(!session)return Response.json({error:'Not authenticated'},{status:401});if(!isFlemming(session))return Response.json({error:'ATLAS Developer is restricted to Flemming.'},{status:403});return Response.json({ok:true,access:'Flemming only',executionEnabled:false,approvalRequired:true});}
