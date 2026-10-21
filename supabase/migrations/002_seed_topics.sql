-- Seed: AZ-900 skills measured as of July 20, 2026 (verified 2026-10-21 against the official study guide).
-- Re-run safely: updates in place when objectives change. Update weights and rows when Microsoft revises the guide.
alter table flashcards add column if not exists created_at timestamptz default now();
insert into skill_area_weights(skill_area,weight_min,weight_max) values ('cloud_concepts',25,30),('architecture_services',35,40),('management_governance',30,35)
on conflict (skill_area) do update set weight_min=excluded.weight_min, weight_max=excluded.weight_max;
insert into topics(skill_area,slug,title,objective,sort_order,source_url,last_verified) values
('cloud_concepts','cloud-computing','Describe cloud computing','- Define cloud computing
- Describe the shared responsibility model
- Define cloud models, including public, private, and hybrid
- Identify appropriate use cases for each cloud model
- Describe the consumption-based model
- Compare cloud pricing models
- Describe serverless',1,'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900','2026-10-21'),
('cloud_concepts','cloud-benefits','Describe the benefits of using cloud services','- Describe the benefits of high availability and scalability in the cloud
- Describe the benefits of reliability and predictability in the cloud
- Describe the benefits of security and governance in the cloud
- Describe the benefits of manageability in the cloud',2,'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900','2026-10-21'),
('cloud_concepts','cloud-service-types','Describe cloud service types','- Describe infrastructure as a service (IaaS)
- Describe platform as a service (PaaS)
- Describe software as a service (SaaS)
- Identify appropriate use cases for each cloud service type (IaaS, PaaS, and SaaS)',3,'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900','2026-10-21'),
('architecture_services','core-architecture','Describe the core architectural components of Azure','- Describe Azure regions, region pairs, and sovereign regions
- Describe availability zones
- Describe Azure datacenters
- Describe Azure resources and resource groups
- Describe subscriptions
- Describe management groups
- Describe the hierarchy of resource groups, subscriptions, and management groups',4,'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900','2026-10-21'),
('architecture_services','compute-networking','Describe Azure compute and networking services','- Compare compute types, including containers, virtual machines, and functions
- Describe virtual machine options, including Azure virtual machines, Azure Virtual Machine Scale Sets, availability sets, and Azure Virtual Desktop
- Describe the resources required for virtual machines
- Describe application hosting options, including web apps, containers, and virtual machines
- Describe virtual networking, including the purpose of Azure virtual networks, subnets, peering, Azure DNS, Azure VPN Gateway, and ExpressRoute
- Define public and private endpoints',5,'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900','2026-10-21'),
('architecture_services','storage','Describe Azure storage services','- Compare Azure Storage services
- Describe storage tiers
- Describe redundancy options
- Describe storage account options and storage types
- Identify options for moving files, including AzCopy, Azure Storage Explorer, and Azure File Sync
- Describe migration options, including Azure Migrate and Azure Data Box',6,'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900','2026-10-21'),
('architecture_services','identity-security','Describe Azure identity, access, and security','- Describe directory services in Azure, including Microsoft Entra ID and Microsoft Entra Domain Services
- Describe authentication methods in Azure, including single sign-on (SSO), multifactor authentication (MFA), and passwordless
- Describe external identities in Azure
- Describe Microsoft Entra Conditional Access
- Describe Azure role-based access control (RBAC)
- Describe the concept of Zero Trust
- Describe the purpose of the defense-in-depth model
- Describe the purpose of Microsoft Defender for Cloud',7,'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900','2026-10-21'),
('management_governance','cost-management','Describe cost management in Azure','- Describe factors that can affect costs in Azure
- Explore the pricing calculator
- Describe cost management capabilities in Azure
- Describe the purpose of tags',8,'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900','2026-10-21'),
('management_governance','governance-compliance','Describe features and tools in Azure for governance and compliance','- Describe the purpose of Microsoft Purview in Azure
- Describe the purpose of Azure Policy
- Describe the purpose of resource locks',9,'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900','2026-10-21'),
('management_governance','management-deployment','Describe features and tools for managing and deploying Azure resources','- Describe the Azure portal
- Describe Azure Cloud Shell, Azure CLI, and Azure PowerShell
- Describe the purpose of Azure Arc
- Describe infrastructure as code (IaC)
- Describe Azure Resource Manager (ARM) and ARM templates',10,'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900','2026-10-21'),
('management_governance','monitoring','Describe monitoring tools in Azure','- Describe the purpose of Azure Advisor
- Describe Azure Service Health
- Describe Azure Monitor, including Log Analytics, Azure Monitor alerts, and Azure Monitor Application Insights',11,'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900','2026-10-21')
on conflict (slug) do update set skill_area=excluded.skill_area,title=excluded.title,objective=excluded.objective,sort_order=excluded.sort_order,source_url=excluded.source_url,last_verified=excluded.last_verified;
