import * as AWS from 'aws-sdk';
import {RemoteHandlebarsTemplateRenderer} from './remote-handlebars-template-renderer';
import {ReadyToSendEmail} from './ready-to-send-email';
import {RequireRatchet} from '../../common/require-ratchet';
import {Logger} from '../../common/logger';
import {SendEmailRequest, SendEmailResponse, SendRawEmailRequest, SendRawEmailResponse} from 'aws-sdk/clients/ses';

export class Mailer {
    public static readonly EMAIL: RegExp = new RegExp(".+@.+\\.[a-z]+");

    constructor(private ses:AWS.SES,
                private defaultSendingAddress: string=null,
                private autoBccAddresses: string[] = [],
                private templateRenderer: RemoteHandlebarsTemplateRenderer = null){
        RequireRatchet.notNullOrUndefined(this.ses);
    }

    public async fillEmailBody(rts: ReadyToSendEmail, context: any, htmlTemplateName:string, txtTemplateName: string=null): Promise<ReadyToSendEmail> {
        rts.htmlMessage = await this.templateRenderer.renderRemoteTemplate(htmlTemplateName, context);
        rts.txtMessage = (!!txtTemplateName)?await this.templateRenderer.renderRemoteTemplate(txtTemplateName, context):null;
        return rts;
    }

    public async sendEmail(rts:ReadyToSendEmail): Promise<SendRawEmailResponse> {
        let rval: SendRawEmailResponse = null;
        try {
            const from: string = rts.fromAddress || this.defaultSendingAddress;
            const boundary: string = 'NextPart';
            let rawMail:string = 'From: '+from+'\n';
            rawMail += 'To: ' + rts.destinationAddresses.join(', ') + '\n';
            if (!!this.autoBccAddresses && this.autoBccAddresses.length>0) {
                rawMail +='Bcc: ' + this.autoBccAddresses.join(', ') + '\n';
            }
            rawMail += 'Subject: '+rts.subject+'\n';
            rawMail += 'MIME-Version: 1.0\n';
            rawMail += 'Content-Type: multipart/mixed; boundary="'+boundary+'"\n';
            if (!!rts.htmlMessage) {
                rawMail += '\n\n--'+boundary+'\n';
                rawMail += 'Content-Type: text/html\n\n';
                rawMail += rts.htmlMessage;
            }
            if (!!rts.txtMessage) {
                rawMail += '\n\n--'+boundary+'\n';
                rawMail += 'Content-Type: text/plain\n\n';
                rawMail += rts.txtMessage;
            }
            if (rts.attachments) {
                rts.attachments.forEach(a=>{
                    rawMail += '\n\n--'+boundary+'\n';
                    rawMail += 'Content-Type: '+a.contentType+'; name="'+a.filename+'"\n';
                    rawMail += 'Content-Transfer-Encoding: base64\n';
                    rawMail += 'Content-Disposition: attachment\n\n';
                    rawMail += a.base64Data.replace(/([^\0]{76})/g, '$1\n') + '\n\n';
                })
            }
            rawMail += '\n\n--'+boundary+'\n';

            const params: SendRawEmailRequest = {
                RawMessage: {Data: rawMail}
            };

            rval = await this.ses.sendRawEmail(params).promise();
        } catch (err) {
            Logger.error("Error while processing email: %s" ,err,err);
        }

        return rval;

    }

    public static validEmail(email:string):boolean {
        return email !== null && Mailer.EMAIL.test(email);
    }


    /*
    public async sendEmail2(rts:ReadyToSendEmail): Promise<SendEmailResponse> {
        let rval: SendEmailResponse = null;

        try {
            //const p: SendRawEmailRequest = {};

            const params: SendEmailRequest = {
                Destination: {
                    ToAddresses: rts.destinationAddresses,
                    BccAddresses: this.autoBccAddresses
                },
                Message: {
                    Body: {
                        Html: {
                            Data: rts.htmlMessage
                        },
                        Text: {
                            Data: rts.txtMessage
                        }
                    },
                    Subject: {
                        Data: rts.subject
                    }
                },
                Source: rts.fromAddress || this.defaultSendingAddress
            };

            rval = await this.ses.sendEmail(params).promise();

            Logger.debug('Got send result : %j', rval);
        } catch (err) {
            Logger.error("Error while processing email: %s" ,err,err);
        }
        return rval;
    }
    */

}