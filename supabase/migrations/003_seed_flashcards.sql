-- Original starter flashcards (shared deck). Safe to re-run: skipped if the deck exists.
with d as (
  insert into flashcard_decks(owner_id,title) select null,'AZ-900 essentials (original starter cards)'
  where not exists (select 1 from flashcard_decks where owner_id is null and title='AZ-900 essentials (original starter cards)') returning id)
insert into flashcards(deck_id,owner_id,topic_id,front,back)
select d.id,null,(select id from topics where slug=x.slug),x.f,x.b from d,
(values
('cloud-computing','What is the shared responsibility model?','Provider and customer split security duties. The provider always secures the physical datacenter; the customer always owns their data and identities; the rest shifts depending on whether it is IaaS, PaaS or SaaS.'),
('cloud-computing','What does the consumption-based model mean?','You pay only for what you use instead of buying hardware upfront. It turns large capital costs (CapEx) into operating costs (OpEx).'),
('cloud-computing','Public vs private vs hybrid cloud?','Public: services run on a provider''s shared infrastructure. Private: infrastructure used by one organization. Hybrid: a mix of both that lets workloads work together.'),
('cloud-benefits','Scalability vs high availability?','Scalability: adjusting capacity up or down to match demand. High availability: designing so the service keeps running despite failures.'),
('cloud-service-types','IaaS, PaaS and SaaS in one line each?','IaaS: you rent virtual machines and manage the OS and above. PaaS: you manage your app and data, the provider runs the platform. SaaS: you simply use finished software.'),
('core-architecture','What is an availability zone?','A physically separate location inside an Azure region with its own power, cooling and networking, used to protect against datacenter-level failures.'),
('core-architecture','What is the Azure organizational hierarchy?','Management groups contain subscriptions, subscriptions contain resource groups, and resource groups contain resources.'),
('core-architecture','What is a resource group?','A logical container for related Azure resources that share a lifecycle. Each resource belongs to exactly one resource group.'),
('compute-networking','What do Virtual Machine Scale Sets do?','They let you create and manage a group of identical, load-balanced VMs that can scale out and in automatically.'),
('compute-networking','VPN Gateway vs ExpressRoute?','VPN Gateway sends encrypted traffic over the public internet. ExpressRoute uses a private connection that does not travel over the public internet.'),
('storage','What are the blob access tiers?','Hot for frequent access, Cool for infrequent access, Cold for rare access, and Archive for long-term data that can wait hours to be retrieved.'),
('storage','LRS vs ZRS vs GRS?','LRS keeps copies in one datacenter. ZRS spreads copies across availability zones in one region. GRS also replicates to a second, distant region.'),
('identity-security','What is Microsoft Entra ID?','A cloud-based identity and access management service that handles sign-in and access to resources.'),
('identity-security','What is Azure RBAC?','Access control that assigns roles (such as Reader or Contributor) to users or groups at a scope: subscription, resource group or resource.'),
('identity-security','What is Zero Trust?','A security approach built on verifying explicitly, giving least-privilege access, and assuming a breach instead of trusting anything by default.'),
('cost-management','What are tags used for?','Name-value labels on resources that help organize them and track costs by project, team or environment.'),
('governance-compliance','Azure Policy vs resource locks?','Azure Policy enforces rules on resources, such as allowed regions. Resource locks prevent accidental deletion or changes.'),
('management-deployment','What are ARM templates?','Declarative files that describe the resources you want. Azure Resource Manager deploys them consistently, which is infrastructure as code.'),
('monitoring','What does Azure Service Health tell you?','Azure service problems and planned maintenance that affect the resources you use.'),
('monitoring','What does Azure Advisor do?','Gives personalized recommendations to improve reliability, security, performance, cost and operational excellence.')
) as x(slug,f,b);
