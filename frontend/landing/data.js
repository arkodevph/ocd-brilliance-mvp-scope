import source from './source-content.json';

export const phone = '0428 820 059';
export const email = 'info@ocdbrilliance.com.au';
export const services = [
  {
    slug: 'cleaning',
    title: 'Cleaning',
    icon: 'sparkles',
    label: 'A calmer space',
    description: 'A fresh, comfortable home, cared for with attention to the little things.',
    intro:
      'Thoughtful home cleaning that fits around your routine, with a colour-coded microfibre system and products chosen with your needs in mind.',
    includes: [
      'Kitchen and bathroom cleaning',
      'Vacuuming, mopping and surfaces',
      'Weekly or fortnightly visits',
      'A colour-coded microfibre system',
    ],
    audience: 'Participants who need support keeping their home clean, comfortable and safe.',
    limit:
      'The tasks, products and frequency are agreed with you first. Tell us about allergies, sensitivities or particular cleaning needs. A general house clean is not automatically funded by the NDIS.',
    detail:
      'Your preferences matter, from the products used to the rooms you would like us to focus on. OCD Brilliance describes its approach as chemical-free cleaning; the team can explain the actual products and method before a visit.',
    faq: 'Can you work around product sensitivities?',
    answer:
      'Tell the team about your sensitivities when you enquire. Products and tasks can be discussed before support begins.',
  },
  {
    slug: 'domestic-assistance',
    title: 'Domestic assistance',
    icon: 'home',
    label: 'Everyday made easier',
    description: 'A helping hand with the household tasks that make daily life flow.',
    intro:
      'Practical support with the everyday things, helping your home feel comfortable while you stay in charge of your routine.',
    includes: [
      'Meal preparation and light cooking',
      'Laundry, ironing and linen changes',
      'Grocery shopping and errands',
      'Home organisation and tidying',
    ],
    audience: 'Participants seeking practical help with household routines and daily tasks.',
    limit:
      'Shopping assistance does not mean the cost of groceries is included. Non-clinical medication prompting is different from nursing or medication administration.',
    detail:
      'Choose the tasks you would like help with. Your worker can support you to participate or take care of an agreed task, depending on your preferences and needs.',
    faq: 'How is this different from cleaning?',
    answer:
      'Cleaning focuses on the condition of your home. Domestic assistance also covers routines such as laundry, meals, shopping and organisation. You can discuss a combination.',
  },
  {
    slug: 'support-work',
    title: 'Support work',
    icon: 'users',
    label: 'Life, on your terms',
    description: 'Familiar, one-to-one support for the things that matter to you.',
    intro:
      'Personalised support to take part in daily life, build confidence and stay connected to your community.',
    includes: [
      'Daily living and personal assistance',
      'Community access and social outings',
      'Building everyday skills',
      'Support attending appointments',
    ],
    audience: 'Participants who want one-to-one assistance at home or in the community.',
    limit:
      'Your goals, support needs and worker match are discussed before starting. Clinical tasks require appropriately qualified support and an agreed care plan.',
    detail:
      'Workers are NDIS-screened and matched to your needs. The team aims to keep your support consistent, communicating with you when a worker needs to change.',
    faq: 'Will I see the same worker?',
    answer:
      'OCD Brilliance aims to build a consistent relationship. Leave, illness or other changes can mean a replacement; the team will discuss changes with you.',
  },
  {
    slug: 'transport',
    title: 'Transport',
    icon: 'car',
    label: 'More connection',
    description: 'Door-to-door support to get you where you need to be.',
    intro:
      'Travel support for appointments, everyday errands and the community activities you enjoy, across Perth’s northern suburbs.',
    includes: [
      'Medical and therapy appointments',
      'Community activities and outings',
      'Shopping, banking and errands',
      'School, work and day programmes',
    ],
    audience:
      'Participants who need support getting to appointments or taking part in community life.',
    limit:
      'Discuss access requirements, destinations, timing and any equipment before booking. Do not assume a specific vehicle or wheelchair configuration is available.',
    detail:
      'Transport workers are required to hold comprehensive vehicle insurance. Arrangements and any travel charges should be explained and agreed before support starts.',
    faq: 'Can I discuss accessibility requirements?',
    answer:
      'Yes. Tell the team what makes travel comfortable and safe for you so they can confirm whether suitable support is available.',
  },
  {
    slug: 'support-coordination',
    title: 'Support coordination',
    icon: 'compass',
    label: 'A clearer way forward',
    description: 'Understand your plan and connect with the right support.',
    intro:
      'A conversation that makes the details clearer. Work with a coordinator to understand your NDIS plan and explore services that fit your goals.',
    includes: [
      'Understanding your NDIS plan',
      'Connecting with suitable providers',
      'Coordinating your supports',
      'Working through plan questions',
    ],
    audience:
      'Participants with support coordination in their plan who want help navigating services.',
    limit:
      'Availability depends on your plan and the support required. A coordinator cannot guarantee a funding decision or an increase in your budget.',
    detail:
      'Bring your questions, involve a family member or carer if you wish, and work through the next steps together. You retain choice over your providers.',
    faq: 'Do I need this included in my plan?',
    answer:
      'The team can help you check whether your plan includes support coordination and explain the next step. Eligibility should be confirmed before services begin.',
  },
  {
    slug: 'nursing',
    title: 'Nursing',
    icon: 'heart',
    label: 'Care, closer to home',
    description: 'Qualified nursing support, shaped around your assessed needs.',
    intro:
      'In-home nursing provided by Registered Nurses, with an individual care plan and a clinical team involved in your support.',
    includes: [
      'Complex wound care and assessment',
      'Medication and health monitoring',
      'Catheter and stoma management',
      'Complex personal care support',
    ],
    audience:
      'Participants with assessed clinical needs requiring qualified nursing support at home.',
    limit:
      'Each support depends on assessment, registration scope and the nurse’s competencies. This is not an emergency service; call 000 in an emergency.',
    detail:
      'The source site lists high-intensity supports including enteral feeding, dysphagia support, tracheostomy management, ventilator support, subcutaneous injections and epilepsy support. The team must assess and confirm what can safely be provided for each participant.',
    faq: 'How is my nursing support planned?',
    answer:
      'A conversation and clinical assessment inform an individual care plan. The team confirms the support, qualifications and arrangements required before care begins.',
  },
];

export const faqs = [
  [
    'Who can access your NDIS services?',
    'OCD Brilliance supports self-managed, plan-managed and NDIA-managed participants. The team will discuss your needs, plan and available support before you start.',
  ],
  [
    'Which areas do you cover?',
    'Perth’s northern suburbs, north of the river, including Joondalup, Wanneroo, Stirling, Osborne Park and Ellenbrook. Contact the team to confirm your suburb and service availability.',
  ],
  [
    'Will I have a regular support worker?',
    'The team carefully matches workers and aims to keep that relationship consistent. If a worker is unavailable, changes will be communicated and an appropriate alternative discussed.',
  ],
  [
    'Can a family member or coordinator contact you?',
    'Yes. Family members, carers, support coordinators and referrers are welcome to help start the conversation. Your choices remain central to the support you receive.',
  ],
  [
    'Are DVA and aged-care services available?',
    'These funding pathways are expanding and are not currently delivering services, according to the source website’s FAQ. Contact the team for an update. NDIS services are active.',
  ],
  [
    'How do I get started?',
    'Call 0428 820 059 or contact the team to talk about your needs. They will discuss your plan, availability and next steps. You can involve someone you trust throughout the process.',
  ],
  [
    'How do cancellations and travel charges work?',
    'Your individual service agreement sets out the terms and any applicable charges. The source website gives differing cancellation notice periods; ask the team to confirm the terms that apply to your support before agreeing. Travel charges, where applicable, should be itemised.',
  ],
  [
    'How can I raise a concern?',
    'Contact OCD Brilliance by phone or at admin@ocdbrilliance.com.au. You can also contact the NDIS Quality and Safeguards Commission on 1800 035 544. Raising a concern will not affect the support you receive.',
  ],
];

// Coverage: https://ocdbrilliance.com.au/ — approximate suburb centres: https://gist.github.com/pzi/05b2c8e922d256e616b9de3ee3d73238
export const serviceAreas = [
  ['Osborne Park', -31.9143, 115.8231],
  ['Stirling', -31.8864, 115.8099],
  ['Scarborough', -31.898, 115.7716],
  ['Doubleview', -31.8999, 115.7812],
  ['Karrinyup', -31.8739, 115.7708],
  ['Innaloo', -31.8943, 115.7962],
  ['Yokine', -31.9015, 115.8494],
  ['Tuart Hill', -31.8966, 115.8355],
  ['Balga', -31.8576, 115.8358],
  ['Mirrabooka', -31.8662, 115.8663],
  ['Nollamara', -31.8806, 115.8472],
  ['Westminster', -31.8664, 115.8408],
  ['Wembley', -31.9343, 115.82],
  ['Mount Hawthorn', -31.9196, 115.8356],
  ['Joondalup', -31.7403, 115.7701],
  ['Duncraig', -31.8359, 115.7824],
  ['Hillarys', -31.8083, 115.7439],
  ['Clarkson', -31.6844, 115.7268],
  ['Butler', -31.6418, 115.7041],
  ['Alkimos', -31.6254, 115.6899],
  ['Yanchep', -31.5471, 115.6366],
  ['Wanneroo', -31.7573, 115.8065],
  ['Landsdale', -31.8043, 115.8617],
  ['Ellenbrook', -31.7636, 115.975],
  ['Midland', -31.8918, 116.0135],
  ['Midvale', -31.886, 116.0283],
  ['The Vines', -31.7583, 116.0025],
  ['Guildford', -31.899, 115.9718],
  ['Bullsbrook', -31.6554, 115.9977],
  ['Dianella', -31.8905, 115.8717],
  ['Morley', -31.889, 115.9182],
  ['Girrawheen', -31.8407, 115.8403],
  ['Wangara', -31.7915, 115.8281],
  ['Malaga', -31.8556, 115.8935],
  ['Bassendean', -31.9076, 115.9426],
  ['Bayswater', -31.9218, 115.9252],
  ['Caversham', -31.8757, 115.9749],
  ['Aveley', -31.7775, 115.9865],
  ['Swan View', -31.8859, 116.0523],
  ['Greenmount', -31.8983, 116.049],
];
export const suburbs = serviceAreas.map(([name]) => name);
export const steps = [
  [
    'A conversation first',
    'Tell us what would make everyday life a little easier. We’ll listen and talk through your questions.',
  ],
  [
    'A plan shaped with you',
    'Together, we confirm your needs, funding and availability, then agree on the details.',
  ],
  [
    'The right people',
    'We carefully match your support and explain who will be coming to your home.',
  ],
  [
    'A familiar routine',
    'Your support begins with clear expectations, communication and room to adjust.',
  ],
];
export const articles = source.articles;
export const legal = source.legal;
export const legacyRoutes = source.legacyRoutes;
export const mainNav = [
  ['/', 'Home'],
  ['/services', 'Services'],
  ['/funding', 'Funding'],
  ['/about', 'About'],
  ['/resources', 'Resources'],
  ['/careers', 'Careers'],
  ['/contact', 'Contact'],
];
export const routeMeta = {
  '/intake': [
    'Request support',
    'Check your service area and send your support needs to the OCD Brilliance office.',
  ],
  '/': [
    'Support for a life that feels like you',
    'Personalised NDIS, cleaning, home and community support across Perth’s northern suburbs. Explore six services with OCD Brilliance.',
  ],
  '/services': [
    'Support for your everyday',
    'Explore cleaning, domestic assistance, support work, transport, support coordination and nursing.',
  ],
  '/funding': [
    'Making sense of your funding',
    'Understand NDIS plan management and the current status of DVA and aged-care pathways.',
  ],
  '/about': [
    'A family business. A personal commitment.',
    'Meet Adriana and Felician Giuca and discover the story behind OCD Brilliance.',
  ],
  '/areas-we-serve': [
    'Local people. Familiar places.',
    'Find out where OCD Brilliance supports participants across Perth’s northern suburbs.',
  ],
  '/resources': [
    'A little clarity goes a long way',
    'Explore the OCD Brilliance archive of NDIS insights, everyday support and provider guidance.',
  ],
  '/careers': [
    'Bring your care to work',
    'Explore roles in cleaning, support work, coordination and nursing with OCD Brilliance in Perth.',
  ],
  '/contact': [
    'Let’s start with a conversation',
    'Talk to OCD Brilliance about support, referrals, careers or a question. Local presentation enquiry form.',
  ],
  '/faq': [
    'Your questions, answered',
    'Find answers about services, funding, workers, service areas and getting started.',
  ],
  '/participant-rights': [
    'Your support. Your choice.',
    'Understand your rights to dignity, privacy, choice and raising concerns.',
  ],
  '/complaints': [
    'We’re here to listen',
    'Find clear ways to raise feedback or concerns with OCD Brilliance and the NDIS Commission.',
  ],
  '/privacy': [
    'Privacy policy',
    'Read the source OCD Brilliance privacy policy and how this local presentation handles information.',
  ],
  '/terms': [
    'Terms & conditions',
    'Read the archived OCD Brilliance terms and the distinction between website terms and a service agreement.',
  ],
  '/404': ['Let’s get you back on track', 'Find a service or contact the OCD Brilliance team.'],
};
for (const service of services)
  routeMeta[`/services/${service.slug}`] = [service.title, service.intro];
for (const article of articles)
  routeMeta[`/resources/${article.slug}`] = [article.title, article.excerpt.slice(0, 155)];
export const routes = Object.keys(routeMeta);
