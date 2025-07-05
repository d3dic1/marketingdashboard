const orttoService = require('./src/services/orttoService');

async function testJourneyReports() {
  try {
    console.log('Testing Journey Reports...\n');
    
    // Test with a real journey ID
    const journeyId = '64253af9480a112886448f55';
    console.log(`Testing journey report for ID: ${journeyId}`);
    
    const report = await orttoService.fetchJourneyReport(journeyId, 'all-time');
    console.log('\nJourney Report Result:');
    console.log(JSON.stringify(report, null, 2));
    
    // Test multiple journeys
    console.log('\n\nTesting multiple journeys...');
    const journeyIds = [
      '64253af9480a112886448f55',
      '6523cdaa06732b8a1720d81e',
      '65253b2bda108aa9d3821e32'
    ];
    
    const reports = await Promise.all(
      journeyIds.map(async (id) => {
        try {
          return await orttoService.fetchJourneyReport(id, 'all-time');
        } catch (error) {
          console.error(`Error fetching report for ${id}:`, error.message);
          return null;
        }
      })
    );
    
    console.log('\nMultiple Journey Reports:');
    reports.forEach((report, index) => {
      if (report) {
        console.log(`\n${index + 1}. ${report.name}:`);
        console.log(`   Entered: ${report.entered}`);
        console.log(`   In Journey: ${report.in_journey}`);
        console.log(`   Exited: ${report.exited}`);
        console.log(`   Revenue: $${report.revenue}`);
      }
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testJourneyReports(); 