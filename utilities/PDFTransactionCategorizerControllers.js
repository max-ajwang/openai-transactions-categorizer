require('dotenv').config();
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');

class PDFTransactionCategorizer {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY });
  }

  // Extract text from bank statement pdf
  async extractTextFromPDF(pdfPath) {
    try {
      const dataBuffer = fs.readFileSync(pdfPath);
      const data = await pdfParse(dataBuffer);
      return data.text;
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
      // If the result is an object with a single array property, extract it
      if (!Array.isArray(enhanced)) {
        // Try to find the first array property
        const arr = Object.values(enhanced).find((v) => Array.isArray(v));
        if (arr) enhanced = arr;
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
        response_format: { type: 'json_object' },
        max_tokens: 1000,
      });

      const jsonString = response.choices[0].message.content;
      let enhanced = JSON.parse(jsonString);
      // If the result is an object with a single array property, extract it
      if (!Array.isArray(enhanced)) {
        // Try to find the first array property
        const arr = Object.values(enhanced).find((v) => Array.isArray(v));
        if (arr) enhanced = arr;
      }
      return enhanced;
    } catch (error) {
      console.error('AI insights error:', error);
      return 'Could not generate insights due to an error.';
    }
  }

  // Main function
  async analyzeBankStatement(pdfPath) {
    try {
      console.log(`Starting analysis of this bank statement: ${pdfPath}`);

      // Extract text from pdf bank statement
      const pdfText = await this.extractTextFromPDF(pdfPath);
      console.log('PDF text extracted from bank statement successfully.');

      // Extract transactions from the text with AI
      const transactions = await this.extractTransactionsWithAI(pdfText);
      console.log(
        `Found ${transactions.length} transactions in the bank statement.`
      );

      // Categorize transactions and enhanc eaccurancy
      const enhancedTransactions = await this.enhanceCategorization(
        transactions
      );

      // Generate spending insights
      const insights = await this.generateSpendingInsights(
        enhancedTransactions
      );

      // Display results
      console.log('\nTRANSACTION CATEGORIZATION AND ANALYSIS RESULTS');
      console.log('========================================');

      enhancedTransactions.forEach((t, i) => {
        console.log(`${i + 1}. ${t.date} - ${t.description}`);
        console.log(`   Amount: ${t.currency}${t.amount.toFixed(2)}`);
        console.log(`   Category: ${t.category}`);
        console.log('----------------------------------------');
      });

      console.log('\nSPENDING INSIGHTS:');
      console.log('========================================');
      console.log(insights);

      return {
        transactions: enhancedTransactions,
        insights,
      };
    } catch (error) {
      console.error('Error in main analyzeBankStatement function:', error);
      throw error;
    }
  }
}

// Running the categorizer
(async () => {
  const analyzer = new PDFTransactionCategorizer();
  await analyzer.analyzeBankStatement('ACME_BANK.pdf');
})();
