import { GoogleGenAI, Type } from "@google/genai";
import { CVData, JobFilters } from '../types';
import type { Language } from "../translations";

let ai: GoogleGenAI;

const getAI = () => {
  if (!ai) {
    if (!process.env.API_KEY) {
      throw new Error("API_KEY environment variable not set");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
}

const cleanAndParseJson = (text: string) => {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/i, '');
  }
  return JSON.parse(cleaned.trim());
};

const cvDataSchema = {
  type: Type.OBJECT,
  properties: {
    personalInfo: {
      type: Type.STRING,
      description: 'The candidate\'s personal information, including name, contact details, and a professional summary. Each piece of information should be on a new line. The summary should be prefixed with "Summary:".',
    },
    experience: {
      type: Type.STRING,
      description: 'The candidate\'s work experience. Each job should be on a new line, starting with the job title, company, and dates. Achievements and responsibilities should be listed as bullet points starting with a hyphen (-) on subsequent lines.',
    },
    education: {
      type: Type.STRING,
      description: 'The candidate\'s educational background. Each degree should be on a new line, including the degree, university, and dates.',
    },
    skills: {
      type: Type.STRING,
      description: 'A list of the candidate\'s skills. Can be a simple list or categorized.',
    },
  },
  required: ['personalInfo', 'experience', 'education', 'skills'],
};

const jobListSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'The job title.' },
      company: { type: Type.STRING, description: 'The name of the company hiring.' },
      location: { type: Type.STRING, description: 'The location of the job (city, country).' },
      description: { type: Type.STRING, description: 'A brief summary of the job description.' },
      url: { type: Type.STRING, description: 'A direct URL to the job posting.' },
    },
    required: ['title', 'company', 'location', 'description'],
  },
};

const salaryEstimationSchema = {
  type: Type.OBJECT,
  properties: {
    jobTitle: { type: Type.STRING, description: 'The standardized job title.' },
    averageSalary: { type: Type.INTEGER, description: 'The average monthly gross salary in SEK.' },
    salaryRangeMin: { type: Type.INTEGER, description: 'The minimum typical monthly gross salary in SEK.' },
    salaryRangeMax: { type: Type.INTEGER, description: 'The maximum typical monthly gross salary in SEK.' },
    factors: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key factors that influence salary for this role in Sweden.'
    },
    experienceBreakdown: {
      type: Type.OBJECT,
      properties: {
        entryLevel: { type: Type.INTEGER, description: 'Average monthly gross salary in SEK for entry-level (0-2 years).' },
        midLevel: { type: Type.INTEGER, description: 'Average monthly gross salary in SEK for mid-level (2-5 years).' },
        seniorLevel: { type: Type.INTEGER, description: 'Average monthly gross salary in SEK for senior-level (5+ years).' }
      },
      required: ['entryLevel', 'midLevel', 'seniorLevel']
    },
    regionalBreakdown: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          region: { type: Type.STRING, description: 'Name of the Swedish city/region (e.g., Stockholm, Gothenburg, Malmö, Rest of Sweden).' },
          averageSalary: { type: Type.INTEGER, description: 'Average monthly gross salary in SEK for this region.' }
        },
        required: ['region', 'averageSalary']
      }
    },
    taxAdvice: { type: Type.STRING, description: 'A brief 2-3 sentence overview of typical Swedish tax rate (e.g. municipal tax, jobbskatteavdrag) and work benefits like pension contributions (tjänstepension).' }
  },
  required: ['jobTitle', 'averageSalary', 'salaryRangeMin', 'salaryRangeMax', 'factors', 'experienceBreakdown', 'regionalBreakdown', 'taxAdvice']
};

const compatibilityScoreSchema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER, description: 'A compatibility score between 0 and 100 based on how well the CV matches the job description.' },
    explanation: { type: Type.STRING, description: 'A 1-2 sentence explanation of the score.' },
    matches: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key matching skills, experience, or attributes (max 3 items).'
    },
    missing: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Important skills, experience, or requirements that seem missing or could be improved (max 3 items).'
    }
  },
  required: ['score', 'explanation', 'matches', 'missing']
};

const prompts = {
  en: {
    generateCV: (cvData: CVData) => `
      You are an expert CV writer targeting the Swedish job market.
      Create a professional CV in English based on the following information. Use clear and structured Markdown format.

      **Personal Information:**
      ${cvData.personalInfo}

      **Work Experience:**
      ${cvData.experience}

      **Education:**
      ${cvData.education}

      **Skills:**
      ${cvData.skills}

      The CV should be tailored to attract the attention of recruiters in Sweden.
      Key considerations for a Swedish CV:
      - Include a placeholder for the Swedish personal number (Personnummer) like "Personnummer: YYYYMMDD-XXXX" if not provided in the personal info.
      - The professional summary should be concise and may subtly hint at appreciating a healthy work-life balance, which is highly valued in Sweden.
      - Keep the tone professional but approachable.
    `,
    findJobs: (query: string, location: string, filters: JobFilters) => {
      let prompt = `Search for real, active, and recent "${query}" jobs in ${location}, Sweden.
Use the Google Search tool to search for real-time, currently open job listings from Swedish job boards like Arbetsförmedlingen, LinkedIn, Indeed, Blocket Jobb, or corporate sites.
Order the job listings with the newest, freshest, and most relevant positions first.

For every job found, you MUST provide a direct, specific link (URL) to the actual job application or posting detail page. Do NOT provide generic homepages like 'https://www.linkedin.com' or 'https://arbetsformedlingen.se'. The URL must be the exact direct link of the job page found in the search results.

Criteria to apply if applicable:`;
      const { experienceLevel, employmentType, salaryRange } = filters;
      const criteria = [];

      if (experienceLevel && experienceLevel !== 'any') {
        criteria.push(`Experience Level: ${experienceLevel.replace('-', ' ')}`);
      }
      if (employmentType && employmentType !== 'any') {
        criteria.push(`Employment Type: ${employmentType.replace('-', ' ')}`);
      }
      if (salaryRange.trim()) {
        criteria.push(`Salary Range: ${salaryRange} SEK per month`);
      }

      if (criteria.length > 0) {
        prompt += `\n- ${criteria.join('\n- ')}`;
      }
      
      prompt += `\n\nProvide the output strictly as a JSON array matching the schema: Array of {title, company, location, description, url}. No markdown formatting around JSON besides standard output, do not include any other conversational text. Ensure every single entry has a valid, direct URL.`;
      return prompt;
    },
    writeCoverLetter: (cvData: CVData, jobDescription: string) => `
      You are an expert cover letter writer for the Swedish job market.
      Write a professional cover letter in English based on the candidate's CV and the job description below.
      The cover letter MUST follow this exact structure and formatting. Do not output markdown, just plain text.

      [Your Name]
      [Address]
      [Postal Code, City]
      [Email] | [Phone] | [LinkedIn or portfolio link]

      ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

      [Employer’s Name / Company]
      [Company Address]
      [Postal Code, City]

      Subject: Application for [Job Title]

      Dear [Hiring Manager’s Name],

      I am writing to express my interest in the [Job Title] position at [Company Name]. With my experience in [your field/industry] and my skills in [list 2–3 key skills], I am confident that I can contribute positively to your team.

      During my previous role at [Previous Company], I [describe 1–2 major achievements or responsibilities]. This experience has strengthened my abilities in [skills relevant to the job], and I am eager to bring this expertise to [Company Name].

      I am particularly drawn to [Company Name] because of [reason related to company values, projects, or culture]. I am motivated by [specific aspect of the role or company] and am committed to contributing to [specific goal or outcome relevant to the position].

      Thank you for considering my application. I would welcome the opportunity to discuss how my experience and skills can benefit your team. I am available for an interview at your convenience and can be reached via [phone/email].

      Kind regards,
      [Your Name]

      ---
      INSTRUCTIONS FOR YOU (THE AI):
      1.  **Extract Details:** Pull the candidate's personal details (Name, Address, Email, Phone, LinkedIn) from the "Candidate's CV" section. If some details are missing from the CV, omit them from the header. The personal details are in the "Personal Info" part of the CV.
      2.  **Fill Placeholders:** Use the "Job Description" to identify and fill in [Job Title], [Company Name], and [Hiring Manager’s Name]. If the hiring manager's name is not available, use a professional salutation like "Dear Hiring Team" or "Dear [Company Name] Team".
      3.  **Craft Body:** Write compelling body paragraphs based on the candidate's experience and skills, tailoring them to the job description. Do NOT just copy the template text. The template is for structure only. The content should be unique and persuasive, written from the candidate's perspective.
      4.  **Final Output:** Produce only the final, formatted cover letter as plain text. Do not include these instructions or any other explanations.

      **Candidate's CV:**
      Personal Info: ${cvData.personalInfo}
      Experience: ${cvData.experience}
      Education: ${cvData.education}
      Skills: ${cvData.skills}

      **Job Description:**
      ${jobDescription}
    `,
    getInterviewPrep: (jobTitle: string) => `
      I am preparing for a job interview for a "${jobTitle}" position in Sweden.
      Provide me with a list of common interview questions for this role in Sweden, with brief tips on how to answer them.
      Add a section about interview etiquette and work culture in Swedish companies.
      The response should be in English.
    `,
    generateInterviewVideo: (jobTitle: string) => `
      Create a short, 15-second video simulating a professional job interview for a "${jobTitle}" role.
      The video should show a calm and professional interviewer in a modern, well-lit office setting, asking a common interview question relevant to the role.
      Overlay the following tips as on-screen text, appearing one by one:
      - "Maintain good eye contact"
      - "Sit up straight and be engaged"
      - "Speak clearly and confidently"
      - "Listen carefully to the question"
    `,
    getCultureTips: () => `
      Provide a list of essential tips about work culture in Sweden for a newcomer.
      Talk about concepts like "fika", work-life balance, flat organizational structure, and communication style.
      Make the tips easy to understand and practical. The response must be in English.
    `,
    suggestJobsFromCV: (cvData: CVData) => `
      You are a career advisor for the Swedish job market.
      Based on the CV details below, use Google Search to find 5 real, active, and highly recent job openings in Sweden that are a great match for this candidate.
      
      Order the suggestions from most relevant/newest to oldest.
      For each job, provide a title, company, location, a brief customized reason why it's a good match (as the 'description'), and a direct, specific link (URL) to the actual job posting found in the search results. 
      Do NOT provide generic homepages like 'https://www.linkedin.com' or 'https://arbetsformedlingen.se'. The URL must be the exact direct link of the job page found in the search results.
      
      Format the output strictly as a JSON array matching the schema: Array of {title, company, location, description, url}. No extra markdown or conversational text.

      **CV Details:**
      Personal Info & Summary: ${cvData.personalInfo}
      Experience: ${cvData.experience}
      Skills: ${cvData.skills}
      Education: ${cvData.education}
    `,
    parseCV: (text: string) => `
      You are an expert CV parser. Analyze the following raw CV text and structure it into a JSON object.
      Extract the following sections:
      - personalInfo: Name, contact details, and a professional summary.
      - experience: Job history with titles, companies, dates, and bulleted responsibilities.
      - education: Degrees, universities, and dates.
      - skills: A list of skills.

      If a section is not present in the text, return an empty string for that field.
      Do not invent any information. Adhere strictly to the provided JSON schema.

      Raw CV Text:
      ---
      ${text}
      ---
    `,
    parseLinkedIn: (text: string) => `
      You are an expert LinkedIn profile parser. Analyze the pasted text from a LinkedIn profile (which may contain 'About' section, 'Experience', 'Education', 'Skills', contact info, connection counts, and typical LinkedIn copy-paste clutter).
      Your job is to clean up all typical LinkedIn clutter (e.g., "1st", "2nd", "3rd", "Message", "More", connection counts, company follower counts, "Endorsed by", "Show all", etc.) and extract the core professional details into a clean JSON object matching the CV schema:
      - personalInfo: Name, headline/location, and professional summary (combine the LinkedIn Headline, About/Summary, and Contact Info if present).
      - experience: Job history. Extract job titles, companies, dates, and bulleted responsibilities. Format descriptions cleanly into a bulleted list starting with hyphens (-).
      - education: Degrees, universities, and dates.
      - skills: A clean list of skills.

      If a section is not present in the text, return an empty string for that field.
      Do not invent any information. Adhere strictly to the provided JSON schema.

      Pasted LinkedIn Profile Text:
      ---
      ${text}
      ---
    `,
    getSalaryEstimation: (jobTitle: string) => `
      Estimate the average monthly gross salary ranges (in Swedish Krona - SEK) for a "${jobTitle}" in Sweden.
      Provide realistic market values based on current Swedish standards (such as data from SCB or union statistics like Unionen/Sveriges Ingenjörer).
      Make sure to return appropriate estimates for:
      - Overall average salary.
      - Salary ranges for entry-level, mid-level, and senior-level.
      - Regional differences (Stockholm generally has higher salaries compared to Gothenburg, Malmö, or northern Sweden).
      - Key factors affecting salaries in Sweden (e.g. collective agreements/kollektivavtal, English-only vs Swedish fluency, tech sector vs public sector).
      - Specific tax guidance (municipal tax is usually around 30%, state tax applies above a threshold, pension/tjänstepension is typical).
      All monetary values must be in SEK per month. Your response must be in English.
    `,
    analyzeResume: (cvData: CVData) => `
      You are an elite career advisor and resume auditor specializing in the Swedish job market.
      Analyze the following CV details and provide a comprehensive, constructive, and highly professional review.
      Your review must be returned in beautiful, well-structured Markdown, and specifically highlight how to optimize this CV for Swedish recruiters.

      **CV Details to Analyze:**
      - **Personal Info & Summary:** ${cvData.personalInfo}
      - **Work Experience:** ${cvData.experience}
      - **Education:** ${cvData.education}
      - **Skills:** ${cvData.skills}

      Please structure your feedback into these exact sections with clear formatting:
      1. 🇸🇪 **Swedish Market Alignment**: Assess how well the CV aligns with Swedish cultural norms (flat organizations, Janteloven/humility paired with confidence, work-life balance) and standards (such as mentioning "Personnummer: YYYYMMDD-XXXX" as a placeholder, or Swedish language skills).
      2. 🎯 **Strengths**: What is already strong about the candidate's background and presentation?
      3. 🛠️ **Areas for Improvement**: Provide specific, actionable critiques of the text, structure, or presentation.
      4. 📈 **Actionable Recommendations**: Give 4-5 concrete, step-by-step suggestions the user can implement immediately in their input fields (e.g., adding specific skills, rewriting bullet points to focus on outcomes/achievements).

      Keep the tone highly encouraging, professional, and practical. Write the feedback in English.
    `,
    calculateCompatibilityScore: (cvData: CVData, title: string, company: string, description: string) => `
      You are an expert recruiter and career advisor. Compare the candidate's CV details against the job posting details.
      Calculate a Compatibility Score (0-100%) and provide key matching points and missing/gap areas.
      Be realistic and objective, but also constructive.
      
      **Job Posting:**
      - Title: ${title}
      - Company: ${company}
      - Description/Requirements: ${description}

      **Candidate's CV:**
      - Personal Info/Summary: ${cvData.personalInfo}
      - Experience: ${cvData.experience}
      - Education: ${cvData.education}
      - Skills: ${cvData.skills}

      Output must be a JSON object matching the requested schema. Ensure all fields are in English.
    `,
    calculateCultureMatch: (company: string, title: string, jobDescription: string, preferredEnv: string) => `
      You are an expert on organizational psychology and corporate culture.
      Research (using your general knowledge or search grounding) and infer the core values, work culture, and environment of the following company/job:
      - Company: ${company}
      - Job Title: ${title}
      - Job Description details: ${jobDescription}

      Compare this company culture with the user's preferred work environment:
      - User's Preferred Environment: ${preferredEnv}

      Calculate a percentage score (0-100%) indicating how well the company's culture aligns with the user's preferred environment.
      Provide:
      1. A percentage match score.
      2. 1-2 sentences summarizing the cultural values found/inferred for the company.
      3. An explanation of how well it matches the user's preferences.
      4. Pros (2-3 items of alignment).
      5. Cons / Gaps (1-2 items where they might not match or where expectations differ).

      Return the result as a raw JSON object with the following structure:
      {
        "score": number,
        "companyValues": string,
        "explanation": string,
        "pros": string[],
        "cons": string[]
      }
      Do not include any extra text outside the JSON object. Ensure all fields are in English.
    `,
  },
  ar: {
    generateCV: (cvData: CVData) => `
      أنت خبير في كتابة السير الذاتية وموجه للم سوق العمل السويدي.
      قم بإنشاء سيرة ذاتية احترافية باللغة العربية بناءً على المعلومات التالية. استخدم تنسيق Markdown واضح ومنظم.

      **المعلومات الشخصية:**
      ${cvData.personalInfo}

      **الخبرة العملية:**
      ${cvData.experience}

      **التعليم:**
      ${cvData.education}

      **المهارات:**
      ${cvData.skills}

      يجب أن تكون السيرة الذاتية مصممة لجذب انتباه مسؤولي التوظيف في السويد.
      اعتبارات رئيسية للسيرة الذاتية السويدية:
      - أضف عنصرًا نائبًا للرقم الشخصي السويدي (Personnummer) مثل "الرقم الشخصي: YYYYMMDD-XXXX" إذا لم يكن متوفرًا في المعلومات الشخصية.
      - يجب أن يكون الملخص المهني موجزًا وقد يلمح بمهارة إلى تقدير التوازن الصحي بين العمل والحياة، وهو أمر يحظى بتقدير كبير في السويد.
      - حافظ على نبرة احترافية ولكن ودودة.
    `,
    findJobs: (query: string, location: string, filters: JobFilters) => {
      let prompt = `البحث عن وظائف "${query}" حقيقية، نشطة ومحدثة في ${location}، السويد.
استخدم أداة بحث Google للبحث عن وظائف حقيقية شاغرة حالياً من مواقع التوظيف السويدية الكبرى مثل Arbetsförmedlingen و LinkedIn و Indeed و Blocket Jobb ومواقع الشركات الرسمية.
قم بترتيب النتائج بحيث تظهر الوظائف الأحدث والأكثر صلة أولاً (مرتبة ومحدثة).

بالنسبة لكل وظيفة تجدها، يجب عليك إرفاق رابط مباشر وحقيقي (URL) لصفحة تقديم الطلب أو صفحة تفاصيل الوظيفة مباشرة. لا تضع روابط عامة مثل 'https://www.linkedin.com' أو 'https://arbetsformedlingen.se'، بل يجب أن يكون الرابط هو الرابط المباشر المحدد للوظيفة كما هو في نتائج البحث.

المعايير المطلوبة:`;
      const { experienceLevel, employmentType, salaryRange } = filters;
      const criteria = [];
      
      if (experienceLevel && experienceLevel !== 'any') {
        criteria.push(`مستوى الخبرة: ${experienceLevel.replace('-', ' ')}`);
      }
      if (employmentType && employmentType !== 'any') {
        criteria.push(`نوع الوظيفة: ${employmentType.replace('-', ' ')}`);
      }
      if (salaryRange.trim()) {
        criteria.push(`نطاق الراتب: ${salaryRange} كرونة سويدية شهريًا`);
      }
      
      if (criteria.length > 0) {
        prompt += `\n- ${criteria.join('\n- ')}`;
      }
      prompt += `\n\nقدم النتائج حصرياً كمصفوفة JSON مطابقة للمخطط: مصفوفة من العناصر {title, company, location, description, url}. لا تضع أي مقدمات أو نصوص خارج هيكل JSON، واحرص على أن يكون لكل وظيفة رابط تقديم مباشر وحقيقي مستخرج من نتائج البحث.`;
      return prompt;
    },
    writeCoverLetter: (cvData: CVData, jobDescription: string) => `
      أنت خبير في كتابة خطابات التقديم لسوق العمل السويدي.
      اكتب خطاب تقديم احترافي باللغة العربية باستخدام السيرة الذاتية للمرشح ووصف الوظيفة أدناه.
      يجب أن يتبع خطاب التقديم هذا الهيكل والتنسيق بالضبط. لا تقم بإخراج markdown، فقط نص عادي.

      [اسمك]
      [العنوان]
      [الرمز البريدي، المدينة]
      [البريد الإلكتروني] | [الهاتف] | [رابط لينكدإن أو ملف الأعمال]

      ${new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}

      [اسم صاحب العمل / الشركة]
      [عنوان الشركة]
      [الرمز البريدي، المدينة]

      الموضوع: طلب وظيفة [المسمى الوظيفي]

      عزيزي [اسم مدير التوظيف]،

      أكتب إليكم لأعرب عن اهتمامي بوظيفة [المسمى الوظيفي] في [اسم الشركة]. بفضل خبرتي في [مجالك/صناعتك] ومهاراتي في [اذكر 2-3 مهارات رئيسية]، أنا واثق من أنني أستطيع المساهمة بشكل إيجابي في فريقكم.

      خلال دوري السابق في [الشركة السابقة]، قمت بـ [صف 1-2 من الإنجازات أو المسؤوليات الرئيسية]. لقد عززت هذه التجربة قدراتي في [المهارات ذات الصلة بالوظيفة]، وأنا حريص على جلب هذه الخبرة إلى [اسم الشركة].

      أنا مهتم بشكل خاص بـ [اسم الشركة] بسبب [سبب يتعلق بقيم الشركة أو مشاريعها أو ثقافتها]. يحفزني [جانب معين من الدور أو الشركة] وأنا ملتزم بالمساهمة في [هدف أو نتيجة محددة ذات صلة بالوظيفة].

      شكرًا لكم على النظر في طلبي. يسعدني أن تتاح لي الفرصة لمناقشة كيف يمكن لخبرتي ومهاراتي أن تفيد فريقكم. أنا متاح لإجراء مقابلة في الوقت الذي يناسبكم ويمكن الوصول إلي عبر [الهاتف/البريد الإلكتروني].

      مع خالص التقدير،
      [اسمك]

      ---
      تعليمات لك (الذكاء الاصطناعي):
      1.  **استخراج التفاصيل:** استخرج التفاصيل الشخصية للمرشح (الاسم، العنوان، البريد الإلكتروني، الهاتف، لينكدإن) من قسم "سيرة المرشح". إذا كانت بعض التفاصيل مفقودة من السيرة الذاتية، فاحذفها من الترويسة. التفاصيل الشخصية موجودة في قسم "المعلومات الشخصية" من السيرة الذاتية.
      2.  **ملء العناصر النائبة:** استخدم "وصف الوظيفة" لتحديد وملء [المسمى الوظيفي] و [اسم الشركة] و [اسم مدير التوظيف]. إذا لم يكن اسم مدير التوظيف متاحًا، فاستخدم تحية احترافية مثل "عزيزي فريق التوظيف" أو "عزيزي فريق [اسم الشركة]".
      3.  **صياغة المحتوى:** اكتب فقرات مقنعة بناءً على خبرة المرشح ومهاراته، مع تكييفها مع وصف الوظيفة. لا تقم فقط بنسخ نص القالب. القالب مخصص للهيكل فقط. يجب أن يكون المحتوى فريدًا ومقنعًا ومكتوبًا من وجهة نظر المرشح.
      4.  **الإخراج النهائي:** قم بإنتاج خطاب التقديم النهائي المنسق كنص عادي فقط. لا تقم بتضمين هذه التعليمات أو أي توضيحات أخرى.

      **سيرة المرشح:**
      المعلومات الشخصية: ${cvData.personalInfo}
      الخبرة: ${cvData.experience}
      التعليم: ${cvData.education}
      المهارات: ${cvData.skills}

      **وصف الوظيفة:**
      ${jobDescription}
    `,
    getInterviewPrep: (jobTitle: string) => `
      أنا أستعد لمقابلة عمل لوظيفة "${jobTitle}" في السويد.
      قدم لي قائمة بالأسئلة الشائعة في المقابلة لهذا المنصب في السويد، مع نصائح موجزة حول كيفية الإجابة عليها.
      أضف قسمًا عن آداب المقابلات وثقافة العمل في الشركات السويدية.
      يجب أن تكون الإجابة باللغة العربية.
    `,
    generateInterviewVideo: (jobTitle: string) => `
      أنشئ مقطع فيديو قصيرًا مدته 15 ثانية يحاكي مقابلة عمل احترافية لوظيفة "${jobTitle}".
      يجب أن يُظهر الفيديو محاورًا هادئًا ومحترفًا في بيئة مكتبية حديثة ومضاءة جيدًا، وهو يطرح سؤال مقابلة شائعًا ذا صلة بالوظيفة.
      اعرض النصائح التالية كنص على الشاشة، تظهر الواحدة تلو الأخرى:
      - "حافظ على التواصل البصري الجيد"
      - "اجلس باستقامة وكن متفاعلًا"
      - "تحدث بوضوح وثقة"
      - "استمع جيدًا للسؤال"
    `,
    getCultureTips: () => `
      قدم قائمة نصائح أساسية حول ثقافة العمل في السويد لشخص جديد في البلد.
      تحدث عن مفاهيم مثل "fika"، التوازن بين العمل والحياة، الهيكل التنظيمي المسطح، وأسلوب التواصل.
      اجعل النصائح سهلة الفهم وعملية. الرد يجب أن يكون باللغة العربية.
    `,
     suggestJobsFromCV: (cvData: CVData) => `
      أنت مستشار مهني لسوق العمل السويدي.
      بناءً على تفاصيل السيرة الذاتية أدناه، استخدم أداة بحث Google للبحث عن 5 فرص عمل حقيقية، نشطة ومحدثة جداً في السويد تكون مطابقة لمهارات وخبرات هذا المرشح.
      
      رتب النتائج بحيث تظهر الوظائف الأحدث والأكثر ملاءمة أولاً.
      لكل وظيفة، قدم المسمى الوظيفي (title)، الشركة (company)، الموقع (location)، وسبباً مخصصاً وموجزاً يوضح سبب ملاءمتها للمرشح (description)، ورابطاً مباشراً وحقيقياً (url) لإعلان الوظيفة المحدد والمستخرج من نتائج البحث.
      لا تضع روابط عامة للمواقع الرئيسية مثل 'https://www.linkedin.com'، بل يجب وضع الرابط المباشر المحدد للوظيفة.
      
      نسّق الإخراج حصرياً كمصفوفة JSON تطابق المخطط: مصفوفة من العناصر {title, company, location, description, url}. لا تضع أي مقدمات أو نصوص خارج هيكل JSON.

      **تفاصيل السيرة الذاتية:**
      المعلومات الشخصية والملخص: ${cvData.personalInfo}
      الخبرة: ${cvData.experience}
      المهارات: ${cvData.skills}
      التعليم: ${cvData.education}
    `,
    parseCV: (text: string) => `
      أنت محلل خبير للسير الذاتية. قم بتحليل نص السيرة الذاتية الخام التالي وهيكلته في كائن JSON.
      استخرج الأقسام التالية:
      - personalInfo: الاسم، تفاصيل الاتصال، وملخص احترافي.
      - experience: التاريخ الوظيفي مع المسميات الوظيفية، الشركات، التواريخ، والمسؤوليات كنقاط.
      - education: الشهادات، الجامعات، والتواريخ.
      - skills: قائمة بالمهارات.

      إذا لم يكن قسم ما موجودًا في النص، فقم بإرجاع سلسلة فارغة لهذا الحقل.
      لا تخترع أي معلومات. التزم بدقة بمخطط JSON المقدم.

      نص السيرة الذاتية الخام:
      ---
      ${text}
      ---
    `,
    parseLinkedIn: (text: string) => `
      أنت محلل خبير لملفات لينكدإن (LinkedIn). قم بتحليل النص المنسوخ من ملف لينكدإن الشخصي (والذي قد يحتوي على قسم "حول"، "الخبرة"، "التعليم"، "المهارات"، معلومات الاتصال، وعبارات لينكدإن الشائعة).
      مهمتك هي تنظيف النص من جميع العبارات والشوائب الخاصة بموقع لينكدإن (مثل "درجة أولى"، "مراسلة"، "المزيد"، عدد الاتصالات، "موصى به من قبل"، إلخ) واستخراج التفاصيل المهنية الأساسية في كائن JSON نظيف يطابق مخطط السيرة الذاتية:
      - personalInfo: الاسم، المسمى الوظيفي/الموقع، والملخص المهني (اجمع بين عنوان الملف التعريفي وقسم "نبذة/حول" ومعلومات الاتصال إن وجدت).
      - experience: تاريخ العمل. استخرج المسميات الوظيفية، الشركات، التواريخ، والمسؤوليات. قم بتنسيق المهام كنقاط تبدأ بشرطة (-).
      - education: الشهادات، الجامعات، والتواريخ.
      - skills: قائمة نظيفة بالمهارات المستخرجة.

      إذا لم يكن قسم ما موجودًا في النص، فقم بإرجاع سلسلة فارغة لهذا الحقل.
      لا تخترع أي معلومات. التزم بدقة بمخطط JSON المقدم.

      النص المنسوخ من لينكدإن:
      ---
      ${text}
      ---
    `,
    getSalaryEstimation: (jobTitle: string) => `
      قدّر نطاقات الرواتب الشهرية الإجمالية بـ (الكرونة السويدية - SEK) لوظيفة "${jobTitle}" في السويد.
      يرجى تقديم قيم واقعية وموثوقة بناءً على البيانات الحالية لسوق العمل السويدي (مثل إحصاءات SCB أو نقابات العمال مثل Unionen/Sveriges Ingenjörer).
      تأكد من تقديم تقديرات لـ:
      - متوسط الراتب العام.
      - الرواتب حسب مستوى الخبرة (مبتدئ، متوسط، خبير).
      - الفروق الإقليمية (Stockholm, Gothenburg, Malmö, وباقي السويد).
      - العوامل الرئيسية المؤثرة على الرواتب في السويد (مثلاً: الاتفاقيات الجماعية kollektivavtal، مستوى اللغة السويدية، إلخ).
      - توجيهات ضريبية عامة (ضريبة البلدية حوالي 30%، والتقاعد tjänstepension).
      يجب أن تكون قيم الرواتب بالأرقام والعملة SEK شهرياً. يجب أن تكون الردود والتوجيهات والأسماء باللغة العربية.
    `,
    analyzeResume: (cvData: CVData) => `
      أنت مستشار مهني وخبير في تدقيق السير الذاتية في سوق العمل السويدي.
      قم بتحليل تفاصيل السيرة الذاتية التالية وتقديم مراجعة شاملة وبناءة واحترافية للغاية.
      يجب أن تكون مراجعتك بتنسيق Markdown منسق وجميل، وتوضح بالتحديد كيفية تحسين هذه السيرة الذاتية لتناسب مسؤولي التوظيف السويديين.

      **تفاصيل السيرة الذاتية للتحليل:**
      - **المعلومات الشخصية والملخص:** ${cvData.personalInfo}
      - **الخبرة العملية:** ${cvData.experience}
      - **التعليم:** ${cvData.education}
      - **المهارات:** ${cvData.skills}

      يرجى تقسيم ملاحظاتك إلى هذه الأقسام المحددة:
      1. 🇸🇪 **التوافق مع السوق السويدي**: تقييم مدى توافق السيرة الذاتية مع ثقافة العمل السويدية (المنظمات المسطحة، التوازن بين العمل والحياة) والمعايير السويدية (مثل ذكر الرقم الشخصي "Personnummer" كعنصر نائب، أو مهارات اللغة السويدية).
      2. 🎯 **نقاط القوة**: ما هو قوي بالفعل في خلفية المرشح وطريقة عرضه؟
      3. 🛠️ **مجالات التحسين**: تقديم انتقادات محددة وقابلة للتطبيق حول النص أو الهيكل أو العرض التقديمي.
      4. 📈 **توصيات عملية**: تقديم 4-5 اقتراحات ملموسة وخطوة بخطوة يمكن للمستخدم تطبيقها على الفور في حقول الإدخال (مثل إضافة مهارات محددة، أو إعادة كتابة نقاط الخبرة للتركيز على الإنجازات والنتائج).

      حافظ على نبرة مشجعة للغاية ومحترفة وعملية. اكتب الملاحظات باللغة العربية.
    `,
    calculateCompatibilityScore: (cvData: CVData, title: string, company: string, description: string) => `
      أنت مسؤول توظيف وخبير وظيفي بارز. قارن تفاصيل السيرة الذاتية للمرشح مع تفاصيل الإعلان الوظيفي.
      احسب نسبة ملاءمة السيرة الذاتية للوظيفة (0-100%) وحدد نقاط التوافق الرئيسية والمهارات أو المتطلبات الناقصة.
      كن واقعياً وموضوعياً، وبنفس الوقت بناءً في نقدك.

      **الإعلان الوظيفي:**
      - المسمى الوظيفي: ${title}
      - الشركة: ${company}
      - الوصف/المتطلبات: ${description}

      **السيرة الذاتية للمرشح:**
      - المعلومات الشخصية والملخص: ${cvData.personalInfo}
      - الخبرات: ${cvData.experience}
      - التعليم: ${cvData.education}
      - المهارات: ${cvData.skills}

      يجب أن تكون المخرجات عبارة عن كائن JSON يطابق المخطط المطلوب. تأكد من أن جميع الحقول مكتوبة باللغة العربية.
    `,
    calculateCultureMatch: (company: string, title: string, jobDescription: string, preferredEnv: string) => `
      أنت خبير في علم النفس التنظيمي وثقافة الشركات.
      ابحث (باستخدام معرفتك العامة أو البحث المتاح) واستنتج القيم الأساسية وثقافة العمل والبيئة للشركة والوظيفة التالية:
      - الشركة: ${company}
      - المسمى الوظيفي: ${title}
      - تفاصيل وصف الوظيفة: ${jobDescription}

      قارن ثقافة هذه الشركة مع بيئة العمل المفضلة لدى المستخدم:
      - بيئة العمل المفضلة للمستخدم: ${preferredEnv}

      احسب نسبة مئوية (0-100%) توضح مدى توافق ثقافة الشركة مع بيئة العمل المفضلة للمستخدم.
      قدم ما يلي:
      1. نسبة مئوية لدرجة التوافق.
      2. ملخص من جملة أو جملتين يوضح قيم الشركة المستنتجة وثقافتها.
      3. شرح لمدى توافق ذلك مع تفضيلات المستخدم.
      4. الإيجابيات (2-3 نقاط من التوافق والانسجام).
      5. السلبيات أو الاختلافات (1-2 نقاط قد لا تتوافق أو تختلف فيها التوقعات).

      يجب أن تكون المخرجات عبارة عن كائن JSON خام يطابق الهيكل التالي:
      {
        "score": number,
        "companyValues": string,
        "explanation": string,
        "pros": string[],
        "cons": string[]
      }
      لا تقم بتضمين أي نصوص إضافية خارج كائن JSON. تأكد من أن جميع الحقول مكتوبة باللغة العربية.
    `,
  },
  sv: {
    generateCV: (cvData: CVData) => `
      Du är en expert på att skriva CV:n anpassade för den svenska arbetsmarknaden.
      Skapa ett professionellt CV på svenska baserat på följande information. Använd ett tydligt och strukturerat Markdown-format.

      **Personuppgifter:**
      ${cvData.personalInfo}

      **Arbetslivserfarenhet:**
      ${cvData.experience}

      **Utbildning:**
      ${cvData.education}

      **Färdigheter:**
      ${cvData.skills}

      CV:t ska vara skräddarsytt för att fånga uppmärksamheten hos rekryterare i Sverige.
      Viktiga punkter för ett svenskt CV:
      - Inkludera en platshållare för svenskt personnummer (t.ex. 'Personnummer: ÅÅMMDD-XXXX') om det inte finns med i personuppgifterna.
      - Sammanfattningen ska vara koncis och kan gärna subtilt antyda en uppskattning för en sund balans mellan arbete och fritid, vilket värderas högt i Sverige.
      - Håll tonen professionell men samtidigt lättillgänglig.
    `,
    findJobs: (query: string, location: string, filters: JobFilters) => {
      let prompt = `Sök efter verkliga, aktiva och nyligen publicerade "${query}" jobb i ${location}, Sverige.
Använd Google Sök-verktyget för att söka efter lediga jobb i realtid från svenska jobbsajter som Arbetsförmedlingen, LinkedIn, Indeed, Blocket Jobb eller direkt från företagswebbplatser.
Sortera jobblistan med de nyaste, mest aktuella och mest relevanta tjänsterna först.

För varje jobb som hittas MÅSTE du ange en direkt och specifik länk (URL) till den faktiska jobbansökan eller detaljsidan. Ange INTE generiska webbadresser som 'https://www.linkedin.com' eller 'https://arbetsformedlingen.se'. Länken måste vara den exakta direktlänken för jobbet som hittades i sökresultaten.

Kriterier att tillämpa om tillgängliga:`;
      const { experienceLevel, employmentType, salaryRange } = filters;
      const criteria = [];

      if (experienceLevel && experienceLevel !== 'any') {
        criteria.push(`Erfarenhetsnivå: ${experienceLevel.replace('-', ' ')}`);
      }
      if (employmentType && employmentType !== 'any') {
        criteria.push(`Anställningstyp: ${employmentType.replace('-', ' ')}`);
      }
      if (salaryRange.trim()) {
        criteria.push(`Löneintervall: ${salaryRange} SEK per månad`);
      }

      if (criteria.length > 0) {
        prompt += `\n- ${criteria.join('\n- ')}`;
      }
      prompt += `\n\nPresentera resultaten strikt som en JSON-array som följer schemat: Array av {title, company, location, description, url}. Ingen extra text utanför JSON. Se till att varje post har en giltig, direkt URL.`;
      return prompt;
    },
    writeCoverLetter: (cvData: CVData, jobDescription: string) => `
      Du är en expert på att skriva personliga brev för den svenska arbetsmarknaden.
      Skriv ett professionellt personligt brev på svenska med hjälp av kandidatens CV och jobbannonsen nedan.
      Det personliga brevet MÅSTE följa exakt denna struktur och formatering. Skriv inte ut markdown, endast vanlig text.

      [Ditt Namn]
      [Adress]
      [Postnummer, Ort]
      [E-post] | [Telefon] | [Länk till LinkedIn eller portfolio]
      
      ${new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}

      [Arbetsgivarens Namn / Företag]
      [Företagets Adress]
      [Postnummer, Ort]

      Ämne: Ansökan till tjänsten som [Jobbtitel]

      Bästa [Rekryterarens Namn],

      Jag skriver för att uttrycka mitt intresse för tjänsten som [Jobbtitel] på [Företagsnamn]. Med min erfarenhet inom [ditt fält/bransch] och mina kunskaper i [lista 2–3 nyckelkompetenser] är jag övertygad om att jag kan bidra positivt till ert team.

      Under min tidigare roll på [Tidigare Företag] [beskriv 1–2 stora prestationer eller ansvarsområden]. Denna erfarenhet har stärkt mina förmågor inom [färdigheter relevanta för jobbet], och jag är ivrig att ta med denna expertis till [Företagsnamn].

      Jag är särskilt intresserad av [Företagsnamn] på grund av [anledning relaterad till företagets värderingar, projekt eller kultur]. Jag motiveras av [specifik aspekt av rollen eller företaget] och är engagerad i att bidra till [specifikt mål eller resultat relevant för positionen].

      Tack för att ni överväger min ansökan. Jag ser fram emot möjligheten att diskutera hur min erfarenhet och mina färdigheter kan gynna ert team. Jag är tillgänglig för en intervju när det passar er och kan nås via [telefon/e-post].

      Med vänliga hälsningar,
      [Ditt Namn]

      ---
      INSTRUKTIONER FÖR DIG (AI):
      1.  **Extrahera uppgifter:** Hämta kandidatens personuppgifter (Namn, Adress, E-post, Telefon, LinkedIn) från avsnittet "Kandidatens CV". Om vissa uppgifter saknas i CV:t, utelämna dem från sidhuvudet. Personuppgifterna finns i "Personuppgifter"-delen av CV:t.
      2.  **Fyll i platshållare:** Använd "Jobbannons" för att identifiera och fylla i [Jobbtitel], [Företagsnamn] och [Rekryterarens Namn]. Om rekryterarens namn inte är tillgängligt, använd en professionell hälsning som "Bästa rekryteringsteam" eller "Bästa [Företagsnamn]-teamet".
      3.  **Skapa brödtext:** Skriv övertygande stycken baserade på kandidatens erfarenhet och färdigheter, och skräddarsy dem efter jobbannonsen. Kopiera INTE bara malltexten. Mallen är endast för strukturen. Innehållet ska vara unikt och övertygande, skrivet ur kandidatens perspektiv.
      4.  **Slutlig output:** Producera endast det slutliga, formaterade personliga brevet som vanlig text. Inkludera inte dessa instruktioner eller några andra förklaringar.

      **Kandidatens CV:**
      Personuppgifter: ${cvData.personalInfo}
      Erfarenhet: ${cvData.experience}
      Utbildning: ${cvData.education}
      Färdigheter: ${cvData.skills}

      **Jobbannons:**
      ${jobDescription}
    `,
    getInterviewPrep: (jobTitle: string) => `
      Jag förbereder mig för en anställningsintervju för en "${jobTitle}"-tjänst i Sverige.
      Ge mig en lista med vanliga intervjufrågor för denna roll i Sverige, med korta tips om hur man besvarar dem.
      Lägg till ett avsnitt om intervjuetikett och arbetskultur på svenska företag.
      Svaret ska vara på svenska.
    `,
    generateInterviewVideo: (jobTitle: string) => `
      Skapa en kort, 15 sekunder lång video som simulerar en professionell anställningsintervju för en "${jobTitle}"-roll.
      Videon ska visa en lugn och professionell intervjuare i en modern, väl upplyst kontorsmiljö, som ställer en vanlig intervjufråga relevant för rollen.
      Lägg över följande tips som text på skärmen, som visas en efter en:
      - "Håll god ögonkontakt"
      - "Sitt rakt och var engagerad"
      - "Tala tydligt och självsäkert"
      - "Lyssna noga på frågan"
    `,
    getCultureTips: () => `
      Ge en lista med viktiga tips om arbetskulturen i Sverige för en nyanländ.
      Berätta om begrepp som "fika", balans mellan arbete och fritid, platta organisationsstrukturer och kommunikationsstil.
      Gör tipsen lättförståeliga och praktiska. Svaret måste vara på svenska.
    `,
    suggestJobsFromCV: (cvData: CVData) => `
      Du är en karriärrådgivare för den svenska arbetsmarknaden.
      Baserat på CV-detaljerna nedan, använd Google Sök för att hitta 5 verkliga, aktiva och mycket nyligen publicerade lediga jobb i Sverige som matchar kandidatens profil perfekt.
      
      Sortera förslagen efter relevans och nyhet, med de nyaste först.
      For varje jobb, ange en titel (title), företag (company), ort (location), en kort motivering anpassad för kandidaten (description) och en direkt, specifik länk (url) till det faktiska jobbannonsen som hittades i sökresultaten.
      Ange INTE generiska webbadresser som 'https://www.linkedin.com' eller 'https://arbetsformedlingen.se'. Länken måste vara den exakta direktlänken för jobbet.
      
      Presentera resultatet strikt som en JSON-array enligt schemat: Array av {title, company, location, description, url}. Ingen extra text utanför JSON.

      **CV-detaljer:**
      Personuppgifter & Sammanfattning: ${cvData.personalInfo}
      Arbetslivserfarenhet: ${cvData.experience}
      Färdigheter: ${cvData.skills}
      Utbildning: ${cvData.education}
    `,
    parseCV: (text: string) => `
      Du är en expert på att tolka CV:n. Analysera följande råa CV-text och strukturera den i ett JSON-objekt.
      Extrahera följande sektioner:
      - personalInfo: Namn, kontaktuppgifter och en professionell sammanfattning.
      - experience: Arbetshistorik med titlar, företag, datum och ansvarsområden i punktform.
      - education: Examina, universitet och datum.
      - skills: En lista med färdigheter.

      Om en sektion inte finns i texten, returnera en tom sträng för det fältet.
      Hitta inte på någon information. Följ strikt det angivna JSON-schemat.

      Rå CV-text:
      ---
      ${text}
      ---
    `,
    parseLinkedIn: (text: string) => `
      Du är en expert på att tolka LinkedIn-profiler. Analysera den klistrade texten från en LinkedIn-profil (som kan innehålla avsnitten 'Om', 'Erfarenhet', 'Utbildning', 'Kompetenser', kontaktinformation, antal kontakter och typiskt LinkedIn-skräp).
      Din uppgift är att rensa bort allt typiskt LinkedIn-skräp (t.ex. "1:a", "2:a", "Meddelande", "Mer", antal kontakter, följare, "Rekommenderad av", etc.) och extrahera de viktigaste professionella detaljerna till ett rent JSON-objekt som matchar CV-schemat:
      - personalInfo: Namn, yrkesrubrik/ort, och professionell sammanfattning (kombinera profilens rubrik, 'Om'-avsnittet och kontaktinformation om tillgängligt).
      - experience: Arbetshistorik. Extrahera yrkestitlar, företag, datum och ansvarsområden i punktform med bindestreck (-).
      - education: Examina, universitet och datum.
      - skills: En ren lista med färdigheter/kompetenser.

      Om en sektion inte finns i texten, returnera en tom sträng för det fältet.
      Hitta inte på någon information. Följ strikt det angivna JSON-schemat.

      Klistrad LinkedIn-profiltext:
      ---
      ${text}
      ---
    `,
    getSalaryEstimation: (jobTitle: string) => `
      Uppskatta de genomsnittliga månatliga bruttolönerna (i svenska kronor - SEK) för en "${jobTitle}" i Sverige.
      Ge realistiska marknadsvärden baserade på aktuell svensk statistik (t.ex. från SCB eller fackliga organisationer som Unionen/Sveriges Ingenjörer).
      Se till att returnera uppskattningar för:
      - Genomsnittlig lön totalt.
      - Löneintervall för ingångsnivå, medelnivå och seniornivå.
      - Regionala skillnader (Stockholm har generellt högre löner jämfört med Göteborg, Malmö eller övriga Sverige).
      - Viktiga faktorer som påverkar lönerna i Sverige (t.ex. kollektivavtal, engelska vs svenska språkkunskaper, tech-sektorn vs offentlig sektor).
      - Specifik skatterådgivning (kommunalskatt är vanligtvis runt 30 %, statlig skatt över en viss tröskel, tjänstepension är standard).
      Alla monetära värden måste vara i SEK per månad. Svaret måste vara på svenska.
    `,
    analyzeResume: (cvData: CVData) => `
      Du är en karriärrådgivare och expert på att granska CV:n för den svenska arbetsmarknaden.
      Analysera följande CV-detaljer och ge en omfattande, konstruktiv och mycket professionell granskning.
      Din granskning måste levereras i vacker, välstrukturerad Markdown och särskilt belysa hur man optimerar detta CV för svenska rekryterare.

      **CV-detaljer att analysera:**
      - **Personuppgifter & Sammanfattning:** ${cvData.personalInfo}
      - **Arbetslivserfarenhet:** ${cvData.experience}
      - **Utbildning:** ${cvData.education}
      - **Färdigheter:** ${cvData.skills}

      Vänligen strukturera din feedback i följande exakta avsnitt:
      1. 🇸🇪 **Anpassning till den svenska marknaden**: Bedöm hur väl CV:t överensstämmer med svenska kulturella normer (platta organisationer, balans mellan arbete och fritid) och standarder (som att ange "Personnummer: ÅÅMMDD-XXXX" som en platshållare, eller kunskaper i det svenska språket).
      2. 🎯 **Styrkor**: Vad är redan starkt i kandidatens bakgrund och presentation?
      3. 🛠️ **Förbättringsområden**: Ge specifika, konkreta synpunkter på texten, strukturen eller presentationen.
      4. 📈 **Konkreta rekommendationer**: Ge 4-5 specifika steg-för-steg-förslag som användaren kan implementera direkt i inmatningsfälten (t.ex. att lägga till specifika färdigheter, skriva om punkter under arbetserfarenhet för att fokusera på resultat/prestationer).

      Håll tonen mycket uppmuntrande, professionell och praktisk. Granskningen måste skrivas på svenska.
    `,
    calculateCompatibilityScore: (cvData: CVData, title: string, company: string, description: string) => `
      Du är en expert på rekrytering och karriärrådgivning. Jämför kandidatens CV-detaljer med jobbannonsens detaljer.
      Beräkna en matchningsprocent (0-100%) och ange de viktigaste matchningspunkterna samt saknade färdigheter/erfarenheter.
      Var realistisk och objektiv, men också konstruktiv.

      **Jobbannons:**
      - Yrkesrubrik: ${title}
      - Företag: ${company}
      - Beskrivning/Krav: ${description}

      **Kandidatens CV:**
      - Personuppgifter/Sammanfattning: ${cvData.personalInfo}
      - Arbetslivserfarenhet: ${cvData.experience}
      - Utbildning: ${cvData.education}
      - Kompetenser: ${cvData.skills}

      Resultatet måste vara ett JSON-objekt som matchar det begärda schemat. Se till att alla fält är på svenska.
    `,
    calculateCultureMatch: (company: string, title: string, jobDescription: string, preferredEnv: string) => `
      Du är en expert på organisationspsykologi och företagskultur.
      Sök efter eller härled kärnvärden, arbetsmetoder och kultur för följande företag/jobb:
      - Företag: ${company}
      - Yrkesrubrik: ${title}
      - Jobbeskrivning: ${jobDescription}

      Jämför företagets kultur med användarens föredragna arbetsmiljö:
      - Användarens föredragna miljö: ${preferredEnv}

      Beräkna en procentuell matchning (0-100%) som visar hur väl företagets kultur stämmer överens med användarens preferenser.
      Ange:
      1. En procentsats för matchningen.
      2. En sammanfattning på 1-2 meningar om företagets värderingar/kultur.
      3. En förklaring av hur väl det matchar användarens preferenser.
      4. Fördelar/matchningspunkter (2-3 punkter där ni matchar).
      5. Nackdelar/risker (1-2 punkter där det kan finnas skillnader i förväntningar).

      Svaret måste vara ett rått JSON-objekt med följande struktur:
      {
        "score": number,
        "companyValues": string,
        "explanation": string,
        "pros": string[],
        "cons": string[]
      }
      Inkludera ingen extra text utanför JSON-objektet. Se till att alla fält är på svenska.
    `,
  }
};

export const generateCV = async (cvData: CVData, lang: Language) => {
  const aiInstance = getAI();
  const prompt = prompts[lang].generateCV(cvData);
  const response = await aiInstance.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
  });
  return response.text;
};

export const findJobs = async (query: string, location: string, lang: Language, filters: JobFilters) => {
  const aiInstance = getAI();
  const prompt = prompts[lang].findJobs(query, location, filters);
  
  const response = await aiInstance.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
// FIX: `responseMimeType` is not allowed when using the `googleSearch` tool.
      // responseMimeType: 'application/json',
// FIX: `responseSchema` is not allowed when using the `googleSearch` tool.
      // responseSchema: jobListSchema,
    },
  });

  try {
    const jobs = cleanAndParseJson(response.text);
    return {
      jobs: Array.isArray(jobs) ? jobs : [],
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
    };
  } catch (e) {
    console.error("Failed to parse job search JSON response:", e);
    return {
      jobs: [{ title: 'Error', company: 'Could not parse job listings.', location: '', description: response.text, url: '' }],
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
    };
  }
};

export const suggestJobsFromCV = async (cvData: CVData, lang: Language) => {
  const aiInstance = getAI();
  const prompt = prompts[lang].suggestJobsFromCV(cvData);

  const response = await aiInstance.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
// FIX: `responseMimeType` is not allowed when using the `googleSearch` tool.
      // responseMimeType: 'application/json',
// FIX: `responseSchema` is not allowed when using the `googleSearch` tool.
      // responseSchema: jobListSchema,
    },
  });

  try {
    const jobs = cleanAndParseJson(response.text);
    return {
      jobs: Array.isArray(jobs) ? jobs : [],
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
    };
  } catch (e) {
     console.error("Failed to parse job suggestion JSON response:", e);
     return {
        jobs: [{ title: 'Error', company: 'Could not parse job suggestions.', location: '', description: response.text, url: '' }],
        sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
    };
  }
};

export const writeCoverLetter = async (cvData: CVData, jobDescription: string, lang: Language) => {
  const aiInstance = getAI();
  const prompt = prompts[lang].writeCoverLetter(cvData, jobDescription);
  const response = await aiInstance.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
  });
  return response.text;
};

export const getInterviewPrep = async (jobTitle: string, lang: Language) => {
  const aiInstance = getAI();
  const prompt = prompts[lang].getInterviewPrep(jobTitle);
  const response = await aiInstance.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
  });
  return response.text;
};

export const generateInterviewVideo = async (jobTitle: string, lang: Language) => {
  const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = prompts[lang].generateInterviewVideo(jobTitle);

  let operation = await aiInstance.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await aiInstance.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  return downloadLink;
};

export const getCultureTips = async (lang: Language) => {
  const aiInstance = getAI();
  const prompt = prompts[lang].getCultureTips();
  const response = await aiInstance.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return response.text;
};

export const parseCVFromText = async (text: string, lang: Language): Promise<CVData> => {
  const aiInstance = getAI();
  const prompt = prompts[lang].parseCV(text);
  const response = await aiInstance.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: cvDataSchema,
    },
  });

  const jsonText = response.text.trim();
  try {
    const parsedData = cleanAndParseJson(jsonText);
    if ('personalInfo' in parsedData && 'experience' in parsedData) {
      return parsedData as CVData;
    } else {
      throw new Error("Parsed JSON does not match CVData structure.");
    }
  } catch (e) {
    console.error("Failed to parse JSON response from Gemini:", e);
    throw new Error("The AI response was not in the expected format. Please try pasting the text again.");
  }
};

export const getSalaryEstimation = async (jobTitle: string, lang: Language) => {
  const aiInstance = getAI();
  const prompt = prompts[lang].getSalaryEstimation(jobTitle);
  const response = await aiInstance.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: salaryEstimationSchema,
    },
  });

  const jsonText = response.text.trim();
  try {
    const parsedData = cleanAndParseJson(jsonText);
    return parsedData;
  } catch (e) {
    console.error("Failed to parse SalaryEstimation JSON response from Gemini:", e);
    throw new Error("Could not parse salary estimation data.");
  }
};

export const analyzeResume = async (cvData: CVData, lang: Language): Promise<string> => {
  const aiInstance = getAI();
  const prompt = prompts[lang].analyzeResume(cvData);
  const response = await aiInstance.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
  });
  return response.text;
};

export const parseLinkedInProfile = async (text: string, lang: Language): Promise<CVData> => {
  const aiInstance = getAI();
  const prompt = prompts[lang].parseLinkedIn(text);
  const response = await aiInstance.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: cvDataSchema,
    },
  });

  const jsonText = response.text.trim();
  try {
    const parsedData = cleanAndParseJson(jsonText);
    if ('personalInfo' in parsedData && 'experience' in parsedData) {
      return parsedData as CVData;
    } else {
      throw new Error("Parsed JSON does not match CVData structure.");
    }
  } catch (e) {
    console.error("Failed to parse LinkedIn JSON response from Gemini:", e);
    throw new Error("The AI response was not in the expected format. Please check the pasted text and try again.");
  }
};

export const getCompatibilityScore = async (cvData: CVData, title: string, company: string, description: string, lang: Language) => {
  const aiInstance = getAI();
  const prompt = prompts[lang].calculateCompatibilityScore(cvData, title, company, description);
  const response = await aiInstance.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: compatibilityScoreSchema,
    },
  });

  const jsonText = response.text.trim();
  try {
    const parsedData = cleanAndParseJson(jsonText);
    return parsedData as {
      score: number;
      explanation: string;
      matches: string[];
      missing: string[];
    };
  } catch (e) {
    console.error("Failed to parse Compatibility JSON response from Gemini:", e);
    throw new Error("Could not parse compatibility score.");
  }
};

export const getCompanyCultureMatch = async (company: string, title: string, jobDescription: string, preferredEnv: string, lang: Language) => {
  const aiInstance = getAI();
  const prompt = prompts[lang].calculateCultureMatch(company, title, jobDescription, preferredEnv);
  
  const response = await aiInstance.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const jsonText = response.text.trim();
  try {
    const parsedData = cleanAndParseJson(jsonText);
    return parsedData as {
      score: number;
      companyValues: string;
      explanation: string;
      pros: string[];
      cons: string[];
    };
  } catch (e) {
    console.error("Failed to parse company culture match JSON response from Gemini:", e);
    throw new Error("Could not parse company culture match.");
  }
};