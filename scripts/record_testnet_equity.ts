import 'dotenv/config';
import path from 'node:path';
import {createBinanceTestnetAdapter,testnetAccountId} from '../src/server/binanceTestnetAdapter';
import {valueAccount} from '../src/server/accountValuation';
import {EquityHistory} from '../src/server/equityHistory';
async function main(){
 const apiKey=process.env.APP_TESTNET_API_KEY??'',accountId=testnetAccountId(apiKey);
 const a=createBinanceTestnetAdapter({apiKey,secretKey:process.env.APP_TESTNET_SECRET_KEY??''});
 const history=new EquityHistory(path.resolve(process.env.APP_TESTNET_EQUITY_HISTORY??'.testnet_equity_history.json'),accountId);
 try{const sample=await valueAccount({accountSnapshot:a.accountSnapshot,tradeContext:a.tradeContext},accountId);console.log(JSON.stringify({operation:'READ_ONLY_EQUITY_OBSERVATION',...history.record(sample)},null,2));}finally{history.close();}
}
main().catch(()=>{console.error('Testnet hesap geçmişi kaydedilemedi. Değerleme, yapılandırma ve süreç kilidini kontrol edin. Emir gönderilmedi.');process.exitCode=1;});
