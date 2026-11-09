export interface PhonePacket {version:1;roomId:string;channel:string;sequence:number;iv:string;ciphertext:string}
export function phoneKey():string;
export function validatePhonePacket(value:unknown,expected?:{roomId?:string;channel?:string;sequence?:number}):{version:1;roomId:string;channel:string;sequence:number};
export function sealPhone(key:string,roomId:string,channel:string,sequence:number,value:unknown):Promise<PhonePacket>;
export function openPhone<T=unknown>(key:string,packet:PhonePacket,expected?:{roomId?:string;channel?:string;sequence?:number}):Promise<T>;
