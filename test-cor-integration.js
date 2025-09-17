import { ContractForecastingService } from './server/services/contract-forecasting.js';

// Test the COR integration by calling the service directly
async function testCORIntegration() {
  console.log('Testing Change Order integration in Contract Forecasting...\n');
  
  const service = new ContractForecastingService();
  const projectId = 'f4882019-2413-4b4f-a376-d2cdb623d420'; // First Bank project
  
  try {
    // Test 1: Get cost codes to see if new added scope appears
    console.log('1. Testing getCostCodes to see if new added scope appears:');
    const costCodes = await service.getCostCodes(projectId);
    console.log('Cost codes found:', costCodes.length);
    
    // Look for our new security system cost code
    const securityCode = costCodes.find(cc => cc.code === 'K25479701-281600-71130');
    if (securityCode) {
      console.log('✅ Added scope cost code found:', securityCode);
    } else {
      console.log('❌ Added scope cost code NOT found');
    }
    
    // Test 2: Test budget calculation for existing cost code with COR
    console.log('\n2. Testing getBudgetPlusApprovedCO for cost code with budget adjustment:');
    const fireExtinguisherEstimate = costCodes.find(cc => cc.code === 'K25479701-104413-71130');
    if (fireExtinguisherEstimate) {
      const budgetWithCO = await service.getBudgetPlusApprovedCO(projectId, fireExtinguisherEstimate.id);
      console.log(`Budget for Fire Extinguisher Cabinets (with COR): $${budgetWithCO}`);
      console.log('Expected: $7,500 (original $5,000 + $2,500 COR)');
      
      if (Math.abs(budgetWithCO - 7500) < 0.01) {
        console.log('✅ Budget calculation with COR is correct');
      } else {
        console.log('❌ Budget calculation with COR is incorrect');
      }
    }
    
    // Test 3: Generate full report to see overall impact
    console.log('\n3. Testing full report generation:');
    const report = await service.generateReport(projectId);
    console.log(`Report generated with ${report.data.length} cost code lines`);
    
    // Find the fire extinguisher line
    const fireExtLine = report.data.find(line => line.costCode === 'K25479701-104413-71130');
    if (fireExtLine) {
      console.log('Fire Extinguisher Cabinet line:');
      console.log(`- Cost Code: ${fireExtLine.costCode}`);
      console.log(`- Description: ${fireExtLine.description}`);
      console.log(`- A (Budget): $${fireExtLine.A}`);
      console.log(`- Expected A: $7,500`);
    }
    
    // Find the security system line
    const securityLine = report.data.find(line => line.costCode === 'K25479701-281600-71130');
    if (securityLine) {
      console.log('\nSecurity System line (added scope):');
      console.log(`- Cost Code: ${securityLine.costCode}`);
      console.log(`- Description: ${securityLine.description}`);
      console.log(`- A (Budget): $${securityLine.A}`);
      console.log(`- Expected A: $15,000`);
      console.log('✅ Added scope COR appears in report');
    } else {
      console.log('❌ Added scope COR does NOT appear in report');
    }
    
    console.log('\nCOR integration test completed!');
    
  } catch (error) {
    console.error('Error testing COR integration:', error);
  }
}

testCORIntegration();