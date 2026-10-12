import type { CVTemplate } from './types';

export const cvTemplates: CVTemplate[] = [
  {
    id: 'malmo',
    nameKey: 'templateMalmoName',
    descriptionKey: 'templateMalmoDescription',
    data: {
      personalInfo: `
Alex Doe
Stockholm, Sweden
+46 70 123 45 67
alex.doe@email.com
linkedin.com/in/alexdoe
github.com/alexdoe

Summary:
Innovative and results-driven Software Engineer with 5+ years of experience in developing and scaling web applications. Proficient in JavaScript, React, and Node.js. Passionate about creating user-friendly interfaces and solving complex problems.
      `.trim(),
      experience: `
Senior Frontend Developer | Tech Solutions Inc. | Stockholm, Sweden (Jan 2021 - Present)
- Led the development of a new component library in React and TypeScript, improving development efficiency by 30%.
- Mentored junior developers and conducted code reviews to maintain high code quality.
- Collaborated with UX/UI designers to implement responsive and accessible user interfaces.

Software Developer | Innovate AB | Gothenburg, Sweden (Jun 2018 - Dec 2020)
- Developed and maintained features for a large-scale e-commerce platform using Angular and Node.js.
- Wrote unit and integration tests, increasing code coverage by 20%.
- Participated in an agile team, contributing to sprint planning and retrospectives.
      `.trim(),
      education: `
Master of Science in Computer Science | KTH Royal Institute of Technology, Stockholm (2016 - 2018)
- Thesis: "Performance Optimization in Single-Page Applications"

Bachelor of Science in Software Engineering | Chalmers University of Technology, Gothenburg (2013 - 2016)
      `.trim(),
      skills: `
- Programming Languages: JavaScript, TypeScript, Python, HTML5, CSS3
- Frameworks/Libraries: React, Node.js, Express, Angular, Redux
- Tools: Git, Docker, Webpack, Jest, Cypress, Figma
- Methodologies: Agile, Scrum, TDD
- Languages: English (Fluent), Swedish (Intermediate)
      `.trim(),
    },
  },
  {
    id: 'gothenburg',
    nameKey: 'templateGothenburgName',
    descriptionKey: 'templateGothenburgDescription',
    data: {
      personalInfo: `
Dr. Evelyn Reed
Uppsala, Sweden | +46 72 987 65 43 | evelyn.reed@email.com

A highly motivated and detail-oriented Research Scientist with a Ph.D. in Molecular Biology and extensive experience in genetic engineering and data analysis. Seeking to leverage research expertise in a challenging academic or R&D role.
      `.trim(),
      experience: `
Postdoctoral Researcher | Uppsala University, Department of Cell and Molecular Biology (Sep 2020 - Present)
- Designed and executed experiments using CRISPR-Cas9 technology, resulting in two publications in peer-reviewed journals.
- Analyzed large genomic datasets using Python and R.
- Supervised and trained two master's students.

Research Assistant | Karolinska Institutet, Stockholm (Jun 2015 - Aug 2016)
- Assisted with laboratory experiments and data collection for a project on cancer cell metabolism.
- Maintained lab equipment and managed inventory.
      `.trim(),
      education: `
Ph.D. in Molecular Biology | Lund University, Lund (2016 - 2020)
- Dissertation: "Functional Analysis of Non-coding RNAs in Eukaryotic Gene Regulation"

Master of Science in Biomedicine | Umeå University, Umeå (2013 - 2015)
      `.trim(),
      skills: `
- Laboratory Techniques: CRISPR-Cas9, PCR, Western Blot, Cell Culture, DNA Sequencing
- Data Analysis: R, Python (Pandas, Matplotlib), Bioconductor, GraphPad Prism
- Software: Microsoft Office Suite, EndNote, Benchling
- Languages: English (Native), Swedish (Proficient)
      `.trim(),
    },
  },
  {
    id: 'stockholm',
    nameKey: 'templateStockholmName',
    descriptionKey: 'templateStockholmDescription',
    data: {
      personalInfo: `
Lina Eriksson
Stockholm, SE | +46 73 123 4567 | lina.eriksson.dev@email.com | linkedin.com/in/linaeriksson | github.com/lina-dev

Summary:
Pragmatic Full-Stack Developer with a focus on building scalable backend systems and robust APIs. Experienced in the entire software development lifecycle, from concept to deployment. Strong advocate for clean code, automated testing, and DevOps principles. Eager to contribute to a product-driven team in a fast-paced environment.
      `.trim(),
      experience: `
Backend Developer | FinTech Innovations AB | Stockholm, Sweden (Mar 2020 - Present)
- Architected and developed microservices using Go and gRPC for a new payment processing platform, handling over 10,000 TPS.
- Implemented CI/CD pipelines with GitLab CI and Docker, reducing deployment time by 40%.
- Maintained and optimized PostgreSQL databases, improving query performance for key services.
- Collaborated with frontend teams to define and implement RESTful APIs.

Junior Software Engineer | Ecom Solutions | Malmö, Sweden (Jun 2018 - Feb 2020)
- Contributed to a monolithic e-commerce application built with Python and Django.
- Developed features for order management and inventory tracking systems.
- Wrote Python scripts for data migration and ETL processes.
      `.trim(),
      education: `
Bachelor of Science in Computer Engineering | Lund University, Faculty of Engineering (LTH) (2015 - 2018)
      `.trim(),
      skills: `
- Backend: Go (Golang), Python, Django, Node.js, Express, gRPC, REST APIs
- Databases: PostgreSQL, Redis, MongoDB
- DevOps & Tools: Docker, Kubernetes, GitLab CI, Terraform, AWS (EC2, S3, RDS)
- Frontend (Familiarity): JavaScript, React, HTML, CSS
- Languages: Swedish (Native), English (Fluent)
      `.trim(),
    },
  },
  {
    id: 'uppsala',
    nameKey: 'templateUppsalaName',
    descriptionKey: 'templateUppsalaDescription',
    data: {
      personalInfo: `
Dr. Johan Bergqvist
Uppsala, Sweden
+46 76 555 1234
j.bergqvist.research@email.com
orcid.org/0000-0002-1234-5678

Summary:
Dedicated and published Clinical Researcher with over 8 years of experience in oncology research and clinical trial coordination. Proven ability to manage complex research projects, analyze clinical data, and contribute to scientific literature. Seeking a position at a leading pharmaceutical company or research institution to advance cancer treatment protocols.
      `.trim(),
      experience: `
Clinical Research Scientist | Uppsala University Hospital, Uppsala, Sweden (Oct 2018 - Present)
- Coordinated a Phase II clinical trial for a novel immunotherapy drug, managing patient recruitment, data collection, and regulatory compliance.
- Authored 3 peer-reviewed articles and presented findings at 2 international conferences.
- Performed statistical analysis of clinical data using SAS and R.

Research Associate | Karolinska Institutet, Stockholm, Sweden (Jul 2015 - Sep 2018)
- Conducted in-vitro studies on cancer cell lines to assess drug efficacy.
- Contributed to grant writing and securing project funding.
      `.trim(),
      education: `
PhD in Medical Science (Oncology) | Lund University, Lund, Sweden (2011 - 2015)
- Thesis: "Mechanisms of Resistance to Targeted Therapies in Non-Small Cell Lung Cancer"

M.Sc. in Molecular Medicine | Uppsala University, Uppsala, Sweden (2009 - 2011)
      `.trim(),
      skills: `
- Research Areas: Oncology, Immunotherapy, Clinical Trials (Phase I-III), Biomarker Discovery
- Methodologies: Good Clinical Practice (GCP), Data Analysis, Statistical Planning, Grant Writing
- Software & Tools: SAS, R, SPSS, GraphPad Prism, REDCap, Microsoft Office Suite
- Languages: Swedish (Native), English (Full professional proficiency)
      `.trim(),
    },
  },
  {
    id: 'kiruna',
    nameKey: 'templateKirunaName',
    descriptionKey: 'templateKirunaDescription',
    data: {
      personalInfo: `Raed Shihab Eldeen
Sweden | a.abushihab@gmail.com | +46 762088082 | lintree/raedshibb

Summary:
A passionate content creator, cultural storyteller, and community advocate with extensive experience across digital media, education, and social engagement. Founder of Arab Sweden, an online platform empowering Arab communities abroad. I create impactful travel content, social initiatives, and mental health support programs aimed at children and youth. My mission is to bridge cultures through storytelling, using digital platforms to celebrate diversity, inspire youth, and help people feel seen, wherever they are.`,
      experience: `Founder—Arab Sweden (Online Platform)
- A Digital initiative supporting Arab expatriates in Europe through video content, livestreams, and resource sharing, focusing on integration, culture, and empowerment.

Digital Content Creator
- Achieved over 30 million views across platforms.
- Grew audience to 27,000+ TikTok followers and 10,000+ YouTube subscribers.
- Content highlights cross-cultural experiences, identity, and life abroad.

Mental Health Advocate for Youth
- Designed and led programs in Sweden to support school dropouts, children with low self-esteem, and family/social reintegration.
- Collaborated with local communities and professionals to deliver effective support.

UNICEF School Counseling Program—Jordan
- Worked directly with over 800 students on academic and emotional support programs under national educational initiatives.`,
      education: ``,
      skills: `Creative Skills & Areas of Expertise:
- Video Production & Editing (Reels, YouTube, TikTok)
- Photography & Digital Storytelling
- Educational & Psychological Counseling
- Community Awareness & Cultural Integration
- Public Speaking & Youth Mentorship

Languages:
- Arabic (Native)
- English (Fluent)
- Swedish (Fluent)
- Romanian (Intermediate)`,
    },
  },
  {
    id: 'lund',
    nameKey: 'templateLundName',
    descriptionKey: 'templateLundDescription',
    data: {
      personalInfo: `
Sofia Johansson
Malmö, Sweden
+46 70 111 22 33
sofia.johansson@email.com
linkedin.com/in/sofiajohansson

Summary:
Results-oriented Sales Manager with 8+ years of experience in the SaaS industry. Proven track record of exceeding sales targets, building high-performing teams, and developing strategic partnerships. Passionate about driving revenue growth and delivering exceptional customer value.
      `.trim(),
      experience: `
Sales Manager | ScandiTech AB | Malmö, Sweden (Apr 2019 - Present)
- Grew annual recurring revenue (ARR) by 40% year-over-year for two consecutive years.
- Led a team of 10 sales executives, providing coaching and performance management to exceed team quotas by an average of 15% each quarter.
- Developed and executed a new market entry strategy for the DACH region, securing 5 key enterprise clients within the first year.

Key Account Manager | Nordic Software | Copenhagen, Denmark (Jan 2016 - Mar 2019)
- Managed a portfolio of 50+ enterprise accounts, achieving a 98% customer retention rate.
- Increased upsell revenue by 25% by identifying customer needs and introducing new product modules.
- Consistently ranked as a top 3 performer in the sales department.
      `.trim(),
      education: `
Bachelor of Business Administration, Marketing | Lund University, School of Economics and Management (2012 - 2015)
      `.trim(),
      skills: `
- Sales & CRM: Salesforce, HubSpot, MEDDIC, Value Selling, Negotiation
- Tools: Microsoft Office Suite, Slack, Google Analytics
- Languages: Swedish (Native), English (Fluent), German (Conversational)
      `.trim(),
    },
  },
  {
    id: 'linkoping',
    nameKey: 'templateLinkopingName',
    descriptionKey: 'templateLinkopingDescription',
    data: {
      personalInfo: `
David Chen, PMP
Linköping, Sweden
+46 73 444 55 66
david.chen.pm@email.com
linkedin.com/in/davidchenpm

Summary:
Certified Project Manager (PMP) with over 10 years of experience leading complex IT and infrastructure projects from initiation to completion. Expertise in Agile and Scrum methodologies, stakeholder management, and risk mitigation. Skilled at delivering projects on time and within budget while leading cross-functional teams.
      `.trim(),
      experience: `
Senior IT Project Manager | Ericsson | Linköping, Sweden (Jun 2018 - Present)
- Managed the end-to-end delivery of a global software platform migration project with a budget of 15M SEK, completing it 10% under budget.
- Coordinated a cross-functional team of 20+ engineers, designers, and QA testers in an Agile/Scrum environment.
- Improved team velocity by 25% by implementing new agile ceremonies and refining backlog management processes.

Project Manager | Saab AB | Stockholm, Sweden (Feb 2014 - May 2018)
- Led a project to upgrade internal network infrastructure across three sites, impacting over 1,000 employees.
- Developed comprehensive project plans, risk registers, and communication plans.
- Successfully managed vendor relationships and contract negotiations.
      `.trim(),
      education: `
Master of Science in Industrial Engineering and Management | Linköping University (2009 - 2014)
      `.trim(),
      skills: `
- Methodologies: Agile, Scrum, Kanban, Waterfall, PMI/PMBOK
- Tools: Jira, Confluence, Trello, Asana, Microsoft Project
- Certifications: Project Management Professional (PMP), Certified ScrumMaster (CSM)
- Skills: Risk Management, Budgeting, Stakeholder Communication, Team Leadership
- Languages: English (Fluent), Swedish (Fluent), Mandarin (Basic)
      `.trim(),
    },
  },
  {
    id: 'umea',
    nameKey: 'templateUmeaName',
    descriptionKey: 'templateUmeaDescription',
    data: {
      personalInfo: `
Fatima Al-Sayed
Umeå, Sweden
+46 76 777 88 99
fatima.alsayed@email.com
linkedin.com/in/fatimaalsayed

Summary:
Enthusiastic and motivated recent graduate with a Master's degree in Interaction Design. Eager to apply academic knowledge and project experience in a junior UX/UI Designer role. Passionate about user-centered design, creating intuitive interfaces, and solving real-world problems through design thinking.
      `.trim(),
      experience: `
UX Design Intern | NorthTech Creative | Umeå, Sweden (Jun 2023 - Aug 2023)
- Assisted the design team with user research, including conducting interviews and creating user personas for a new mobile application.
- Created wireframes, mockups, and interactive prototypes using Figma.
- Participated in usability testing sessions and synthesized feedback to inform design iterations.

Academic Project: 'ConnectU' - Social App for University Students (Spring 2023)
- Led the UI design for a mobile app concept aimed at connecting students with similar interests.
- Developed a complete design system, including color palettes, typography, and component libraries.
- Presented the final prototype to a panel of faculty and industry professionals.
      `.trim(),
      education: `
Master of Science in Human-Computer Interaction & User Experience | Umeå University (2022 - 2024)
- Relevant Coursework: Usability Testing, Information Architecture, Visual Design, Prototyping

Bachelor of Arts in Graphic Design | Damascus University (2017 - 2021)
      `.trim(),
      skills: `
- Design Tools: Figma, Sketch, Adobe XD, Adobe Creative Suite (Photoshop, Illustrator)
- Prototyping: InVision, ProtoPie
- Research Methods: User Interviews, Surveys, Persona Creation, Usability Testing
- Languages: Arabic (Native), English (Fluent), Swedish (Intermediate)
      `.trim(),
    },
  }
];