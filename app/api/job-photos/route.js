import { getBlobContainerClient } from '../../../lib/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safe(value){return String(value||'General').trim().replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||'General'}
function client(){ return getBlobContainerClient(); }

export async function POST(request){
  try{
    const form=await request.formData();
    const file=form.get('file');
    if(!file||typeof file==='string') return Response.json({error:'No file received'},{status:400});
    if(!file.type?.startsWith('image/')) return Response.json({error:'Only image files are allowed'},{status:400});
    if(file.size>20*1024*1024) return Response.json({error:'Maximum photo size is 20 MB'},{status:413});
    const project=safe(form.get('project'));
    const taskId=safe(form.get('taskId'));
    const technician=safe(form.get('technician'));
    const name=safe(file.name);
    const blobName=`jobs/${project}/${taskId}/${Date.now()}-${name}`;
    const container=client();
    await container.createIfNotExists();
    const block=container.getBlockBlobClient(blobName);
    const buffer=Buffer.from(await file.arrayBuffer());
    await block.uploadData(buffer,{blobHTTPHeaders:{blobContentType:file.type},metadata:{project,taskid:taskId,technician,originalname:name}});
    return Response.json({photo:{id:`${Date.now()}-${name}`,name:file.name,blobName,url:`/api/job-photos/file?blob=${encodeURIComponent(blobName)}`,size:file.size,date:new Date().toISOString(),uploadedBy:technician,storage:'Azure Blob Storage'}});
  }catch(error){return Response.json({error:error.message||'Upload failed'},{status:500})}
}

export async function DELETE(request){
  try{
    const blob=new URL(request.url).searchParams.get('blob');
    if(!blob)return Response.json({error:'Blob name required'},{status:400});
    await client().deleteBlob(blob,{deleteSnapshots:'include'});
    return Response.json({ok:true});
  }catch(error){return Response.json({error:error.message||'Delete failed'},{status:500})}
}
