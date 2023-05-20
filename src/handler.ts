import * as dotenv from 'dotenv';
dotenv.config();

import AWS from 'aws-sdk';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuid } from 'uuid';

AWS.config.update({
  region: process.env.AWS_REGION
});

let s3 = new AWS.S3();

const getUploadURL = async (event: APIGatewayProxyEvent): Promise<string[]> => {
  const body = JSON.parse(event.body || '');
  const results = [];
  const bucket = process.env.UPLOAD_BUCKET || '';

  for(let i = 0; i < body.files.length; i++) {
    let imageData = body.files[i];

    const mime = imageData.match(/data:(.*);base64/)[1];
    const buffer = Buffer.from(imageData.replace(/data:image\/\w+;base64,/, ''), 'base64');
    const key = `${uuid()}.${mime.split('/')[1]}`;

    const s3Params: AWS.S3.Types.PutObjectRequest = {
      Body: buffer,
      Key: key,
      ContentType: mime,
      Bucket: bucket,
      // ACL: 'public-read'
    }

    const uploadResult = await s3.putObject(s3Params).promise()

    console.log(uploadResult);
    results.push(`https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`);
  }

  return results;
}

const myHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const results = await getUploadURL(event);

    return {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
       'Access-Control-Allow-Origin': '*',
       'Access-Control-Allow-Headers': '*',
     },
    };
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Some error happened'
      }),
      headers: {
       'Access-Control-Allow-Origin': '*',
       'Access-Control-Allow-Headers': '*',
     },
    };
  }
};

module.exports.handler = myHandler;
