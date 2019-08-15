import * as moment from 'moment-timezone';
import {Logger} from '../common/logger';
import * as fetch from 'portable-fetch';
import * as util from 'util';

export class PublishCircleCiReleaseToSlack {

    public static async process(slackHookUrl: string,
                                timezone: string='America/Los_Angeles',): Promise<string> {

        if (!slackHookUrl) {
            throw new Error('slackHookUrl must be defined');
        }
        const buildNum: string = process.env['CIRCLE_BUILD_NUM'];
        const userName: string = process.env['CIRCLE_USERNAME'];
        const projectName: string = process.env['CIRCLE_PROJECT_REPONAME'];
        const branch: string = process.env['CIRCLE_BRANCH'] || '';
        const tag: string = process.env['CIRCLE_TAG'] || '';
        const sha1: string = process.env['CIRCLE_SHA1'] || '';
        const localTime: string = moment().tz(timezone).format('MMMM Do YYYY, h:mm:ss a z');

        if (!buildNum || !userName || !projectName) {
            throw new Error('CIRCLE_BUILD_NUM, CIRCLE_USERNAME, CIRCLE_PROJECT_REPONAME env vars not set - apparently not in a CircleCI environment');
        }

        Logger.info('Sending slack notification %j with build %s, branch %s, tag %s, sha %s, time: %s',
             buildNum, branch, tag, sha1, localTime);

        const message: string = util.format('%s performed release %s on %s at %s', userName, tag+' '+branch, projectName, localTime);

        const response: Response = await fetch(slackHookUrl, {
            method: 'POST', // *GET, POST, PUT, DELETE, etc.
            mode: 'cors', // no-cors, cors, *same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            headers: {
                'Content-Type': 'application/json',
            },
            redirect: 'follow', // manual, *follow, error
            body: JSON.stringify({text: message}), // body data type must match "Content-Type" header
        });
        const bodyOut: string = await response.text();

        Logger.info('Slack returned : %s', bodyOut);
        return bodyOut;
    }

    public static extractHookUrl(): string {
        let rval: string = null;
        if (process && process.argv && process.argv.length > 2) {
            rval = process.argv[2];
        }
        return rval;
    }

}


/**
 And, in case you are running this command line...
 TODO: should use switches to allow setting the various non-filename params
 **/
Logger.info('Running PublishCircleCiReleaseToSlack from command line arguments');
const hook: string = PublishCircleCiReleaseToSlack.extractHookUrl();
if (!!hook) {
    PublishCircleCiReleaseToSlack.process(hook).then(res => {
        Logger.info('Sent message to slack');
    })
} else {
    console.log('Usage : node publish-circle-ci-release-to-slack {hookUrl} ...');
}



