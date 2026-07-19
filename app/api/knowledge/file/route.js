import { getBlobContainerClient } from '../../../../lib/blob';
export const runtime='nodejs';export const dynamic='force-dynamic';
function container() { return getBlobContainerClient(); }
export async function GET(request){try{const blob=new URL(request.url).searchParams.get('blob');if(!blob)return new Response('Blob name required',{status:400});const response=await container().getBlobClient(blob).download();const headers=new Headers();headers.set('Content-Type',response.contentType||'application/octet-stream');headers.set('Content-Disposition','inline');headers.set('Cache-Control','private, max-age=300');return new Response(response.readableStreamBody,{status:200,headers})}catch(error){return new Response(error.message||'File not found',{status:404})}}
