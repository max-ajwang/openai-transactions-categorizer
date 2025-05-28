import express from 'express';
import * as bankStatementController from '../controllers/bankStatementController.js';

const router = express.Router();

router.route('/analyze').post(bankStatementController.uploadAndAnalyze);
router.route('/analyze/sample').get(bankStatementController.getSampleAnalysis);

export default router;
