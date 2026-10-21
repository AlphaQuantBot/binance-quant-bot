export function paperExit(input:{entry:number;price:number;quantity:number;highest?:number;stopPercent:number;takeProfitPercent:number;feeRate:number}) {
  const {entry,price,quantity,stopPercent,takeProfitPercent,feeRate}=input;
  if(![entry,price,quantity,stopPercent,takeProfitPercent,feeRate].every(Number.isFinite)||entry<=0||price<=0||quantity<=0||stopPercent<=0||stopPercent>=100||takeProfitPercent<=0||feeRate<0||feeRate>=1||(input.highest!==undefined&&(!Number.isFinite(input.highest)||input.highest<=0)))return null;
  const highest=Math.max(entry,price,input.highest??entry);
  const stopPrice=highest*(1-stopPercent/100),takeProfitPrice=entry*(1+takeProfitPercent/100);
  const reason:'STOP_LOSS'|'TAKE_PROFIT'|null=price<=stopPrice?'STOP_LOSS':price>=takeProfitPrice?'TAKE_PROFIT':null;
  const gross=quantity*(price-entry),fees=quantity*(entry+price)*feeRate,net=gross-fees;
  if(![highest,stopPrice,takeProfitPrice,gross,fees,net].every(Number.isFinite))return null;
  return {highest,stopPrice,takeProfitPrice,reason,gross,fees,net,netPercent:net/(quantity*entry)*100,grossPercent:(price-entry)/entry*100,isWin:net>0};
}
export function nextPaperWinRate(trades:number,rate:number,win:boolean) {
  if(!Number.isSafeInteger(trades)||trades<0||!Number.isFinite(rate)||rate<0||rate>100)throw Error('INVALID_PAPER_STATS');
  return Math.round(((rate*trades+(win?100:0))/(trades+1))*100)/100;
}
export function paperAvailableCapital(balance:number,positions:{hasOpenPosition?:boolean;entryPrice?:number;positionQty?:number}[]) {
  if(!Number.isFinite(balance)||balance<0)return 0;
  let reserved=0;
  for(const p of positions.filter(p=>p.hasOpenPosition)){
    if(!Number.isFinite(p.entryPrice)||!Number.isFinite(p.positionQty)||p.entryPrice!<=0||p.positionQty!<=0)return 0;
    reserved+=p.entryPrice!*p.positionQty!;
  }
  return Math.max(0,balance-reserved);
}

export function paperSymbolPrice(prices:{[symbol:string]:number},symbol:string) {
  const price=prices[symbol];return Number.isFinite(price)&&price>0?price:undefined;
}
