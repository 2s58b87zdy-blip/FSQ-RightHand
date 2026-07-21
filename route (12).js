import { readSession } from '../../../../lib/auth';
import { ensureAtlasSchema, isFlemming } from '../../../../lib/atlas';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(){
  const session=await readSession();
  if(!session)return Response.json({error:'Not authenticated'},{status:401});
  try{
    const pool=await ensureAtlasSchema();
    const result=await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.AtlasKnowledge WHERE Status='Approved') AS ApprovedKnowledge,
        (SELECT COUNT(*) FROM dbo.AtlasKnowledge WHERE Status='Draft') AS DraftKnowledge,
        (SELECT COUNT(*) FROM dbo.AtlasConversations) AS Conversations
    `);
    return Response.json({ok:true,...result.recordset[0],webConfigured:Boolean(process.env.OPENAI_API_KEY),vectorStoreConfigured:Boolean(process.env.OPENAI_VECTOR_STORE_ID),developerAccess:isFlemming(session)});
  }catch(error){return Response.json({ok:false,error:error.message},{status:500})}
}
