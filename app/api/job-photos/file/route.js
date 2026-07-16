import { BlobServiceClient } from '@azure/storage-blob';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function container(){const c=process.env.AZURE_STORAGE_CONNECTION_STRING;if(!c)throw new Error('Storage is not configured');return BlobServiceClient.fromConnectionString(c).getContainerClient(process.env.AZURE_STORAGE_CONTAINER||'fsq-documents')}
export async function GET(request){
  try{
    const blob=new URL(request.url).searchParams.get('blob');
    if(!blob)return new Response('Blob name required',{status:400});
    const response=await container().getBlobClient(blob).download();
    const headers=new Headers();
    headers.set('Content-Type',response.contentType||'application/octet-stream');
    headers.set('Cache-Control','private, max-age=300');
    if(response.contentLength)headers.set('Content-Length',String(response.contentLength));
    return new Response(response.readableStreamBody,{status:200,headers});
  }catch(error){return new Response(error.message||'File not found',{status:404})}
}
