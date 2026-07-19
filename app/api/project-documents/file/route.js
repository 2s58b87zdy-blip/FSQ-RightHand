import { BlobServiceClient } from '@azure/storage-blob';
import { readSession } from '../../../../lib/auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function container(){const connection=process.env.AZURE_STORAGE_CONNECTION_STRING;if(!connection)throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');return BlobServiceClient.fromConnectionString(connection).getContainerClient(process.env.AZURE_STORAGE_CONTAINER||'fsq-documents')}
export async function GET(request){
  const session=await readSession();
  if(!session)return Response.json({error:'Not authenticated'},{status:401});
  try{
    const blob=new URL(request.url).searchParams.get('blob');
    if(!blob||!blob.startsWith('project-binder/'))return Response.json({error:'Invalid blob name'},{status:400});
    const client=container().getBlobClient(blob);const download=await client.download();
    const headers=new Headers();
    headers.set('Content-Type',download.contentType||'application/octet-stream');
    headers.set('Content-Disposition',`inline; filename="${blob.split('/').pop().replace(/^\d+-/,'')}"`);
    if(download.contentLength)headers.set('Content-Length',String(download.contentLength));
    return new Response(download.readableStreamBody,{headers});
  }catch(error){return Response.json({error:error?.message||'File could not be opened'},{status:500})}
}
