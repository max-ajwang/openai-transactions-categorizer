import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import multer from 'multer';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

// file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      await fsPromises.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

class PDFTransactionCategorizer {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY });
  }

  // Extract text from bank statement pdf with PDF.js
  async extractTextFromPDF(pdfPath) {
    try {
      const data = await fsPromises.readFile(pdfPath);
      const uint8Array = new Uint8Array(data);
      const pdf = await pdfjsLib.default.getDocument({ data: uint8Array })
        .promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item) => item.str).join(' ');
      }

      return fullText;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw error;
    }
  }

  // Extract transactions from the text with OpenAI
  async extractTransactionsWithAI(pdfText) {
    try {
      const prompt = `Analyze the following bank statement text and extract all transactions in JSON format.
      For each transaction, include:
      - date (format: YYYY-MM-DD)
      - description
      - amount (as number)
      - currency
      
      Also categorize each transaction into one of these categories:
      - Food
      - Transportation
      - Housing
      - Utilities
      - Shopping
      - Entertainment
      - Income
      - Other

       Return ONLY the JSON array, without any additional text or explanation.
        Example: [{"date": "2023-10-01", "description": "Amazon", "amount": 89.99, "currency": "USD", "category": "Shopping"}]
      
        Bank Statement Text:
        ${pdfText}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a financial data extraction expert. Return ONLY valid JSON without any additional text.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
        max_tokens: 2000,
      });

      const jsonString = response.choices[0].message.content;
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error extracting transactions with AI:', error);
      throw error;
    }
  }

  // Enhance categorization accuracy with AI
  async enhanceCategorization(transactions) {
    try {
      const prompt = `
              Review these transactions and improve their categorization accuracy.
            Use these categories: Food, Transportation, Housing, Utilities, Shopping, Entertainment, Income, Other.
            Return ONLY a JSON array with the enhanced transactions - no additional text or explanations.
            
            Current transactions:
            ${JSON.stringify(transactions, null, 2)}
            
            Example response format:
            [
            {
                "date": "2023-10-01",
                "description": "Whole Foods",
                "amount": 127.35,
                "currency": "USD",
                "category": "Food"
            }
            ]
          `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a financial categorization expert. Return ONLY valid JSON without any commentary or Markdown formatting.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
        max_tokens: 2000,
      });

      const jsonString = response.choices[0].message.content;
      let enhanced = JSON.parse(jsonString);
      // Normalize response format
      if (!Array.isArray(enhanced)) {
        enhanced = Object.values(enhanced).find(Array.isArray) || transactions;
      }

      return enhanced;
    } catch (error) {
      console.error('AI categorization error:', error);
      return transactions; // Return original if enhancement fails
    }
  }

  // Generate spending insights with AI
  async generateSpendingInsights(transactions) {
    try {
      const prompt = `
          Analyze these transactions and generate insightful spending analysis:
          - Top spending categories
          - Unusual transactions
          - Weekly/Monthly trends
          - Potential savings opportunities
          
          Transactions:
          ${JSON.stringify(transactions, null, 2)}
          
          Return a well-formatted analysis report.
          `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a financial analyst.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('AI insights error:', error);
      return 'Could not generate insights due to an error.';
    }
  }

  // Main analysis function
  async analyzeBankStatement(pdfPath) {
    try {
      // Validate file exists
      if (!fs.existsSync(pdfPath)) {
        throw new Error('PDF file not found');
      }

      const pdfText = await this.extractTextFromPDF(pdfPath);
      if (!pdfText || pdfText.trim().length === 0) {
        throw new Error('No text extracted from PDF');
      }

      const transactions = await this.extractTransactionsWithAI(pdfText);
      const enhancedTransactions = await this.enhanceCategorization(
        transactions
      );
      const insights = await this.generateSpendingInsights(
        enhancedTransactions
      );

      return {
        success: true,
        transactions: enhancedTransactions,
        insights,
      };
    } catch (error) {
      console.error('Bank statement analysis failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export const uploadAndAnalyze = [
  upload.single('bankStatement'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      const categorizer = new PDFTransactionCategorizer();
      const result = await categorizer.analyzeBankStatement(req.file.path);

      // Clean up file after processing
      try {
        await fs.promises.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }

      return res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      console.error('Upload and analyze error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  },
];

export const getSampleAnalysis = async (req, res) => {
  try {
    const samplePath = path.join(process.cwd(), 'samples', 'ACME_BANK.pdf');

    if (!fs.existsSync(samplePath)) {
      return res.status(404).json({
        success: false,
        error: 'Sample file not found',
      });
    }

    const categorizer = new PDFTransactionCategorizer();
    const result = await categorizer.analyzeBankStatement(samplePath);

    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Sample analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};
