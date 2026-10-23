-- Lets learners add their own video links, and seeds official Microsoft Learn modules.
-- URLs were checked against the Microsoft Learn learning paths on 2026-10-21. Run ONCE.
alter table resources add column if not exists owner_id uuid references auth.users(id) on delete cascade;
drop policy if exists "read" on resources;
create policy "read shared or own" on resources for select using (owner_id is null or owner_id = auth.uid());
create policy "write own" on resources for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
insert into resources(topic_id,kind,title,description,url,source,last_verified)
select (select id from topics where slug=x.slug),'module',x.title,x.descr,x.url,'Microsoft Learn','2026-10-21'
from (values
('cloud-computing','Describe cloud computing','describe-cloud-compute','https://learn.microsoft.com/en-us/training/modules/Cloud concepts, deployment models and shared responsibility./'),
('cloud-benefits','Describe the benefits of using cloud services','describe-benefits-use-cloud-services','https://learn.microsoft.com/en-us/training/modules/The benefits cloud computing can offer an organization./'),
('cloud-service-types','Describe cloud service types','describe-cloud-service-types','https://learn.microsoft.com/en-us/training/modules/IaaS, PaaS and SaaS with use cases and benefits./'),
('core-architecture','Describe the core architectural components of Azure','describe-core-architectural-components-of-azure','https://learn.microsoft.com/en-us/training/modules/Physical infrastructure and how resources are organized./'),
('compute-networking','Describe Azure compute services','describe-azure-compute-networking-services','https://learn.microsoft.com/en-us/training/modules/Core Azure compute services and when to use each./'),
('compute-networking','Describe Azure networking services','describe-azure-networking-services','https://learn.microsoft.com/en-us/training/modules/Secure communication between Azure, on-premises and the internet./'),
('storage','Describe Azure storage services','describe-azure-storage-services','https://learn.microsoft.com/en-us/training/modules/Storage types and resilient, distributed data./'),
('identity-security','Describe Azure identity, access, and security','describe-azure-identity-access-security','https://learn.microsoft.com/en-us/training/modules/Authentication and authorization in Azure./'),
('cost-management','Describe cost management in Azure','describe-cost-management-azure','https://learn.microsoft.com/en-us/training/modules/Estimate, track and manage Azure costs./'),
('governance-compliance','Describe features and tools in Azure for governance and compliance','describe-features-tools-azure-for-governance-compliance','https://learn.microsoft.com/en-us/training/modules/Tools that support governance and compliance./'),
('management-deployment','Describe features and tools for managing and deploying Azure resources','describe-features-tools-manage-deploy-azure-resources','https://learn.microsoft.com/en-us/training/modules/Tools to manage Azure and on-premises resources./'),
('monitoring','Describe monitoring tools in Azure','describe-monitoring-tools-azure','https://learn.microsoft.com/en-us/training/modules/Tools for monitoring your Azure environment./')
) as x(slug,title,descr,url)
where not exists (select 1 from resources r where r.url=x.url and r.owner_id is null);
