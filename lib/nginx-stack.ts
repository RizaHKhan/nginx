import * as cdk from "aws-cdk-lib";
import { AutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import {
  AmazonLinuxGeneration,
  AmazonLinuxImage,
  InstanceType,
  IpAddresses,
  KeyPair,
  LaunchTemplate,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  UserData,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { readFileSync } from "fs";
import path = require("path");
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class NginxStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // INFO: Networking
    const vpc = new Vpc(this, "VPC", {
      vpcName: "nginx-vpc",
      ipAddresses: IpAddresses.cidr("10.0.0.0/16"),
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: "Public",
          cidrMask: 24,
          subnetType: SubnetType.PUBLIC,
        },
      ],
    });

    const securityGroup = new SecurityGroup(this, "SecurityGroup", {
      vpc,
      allowAllOutbound: true,
      securityGroupName: "nginx-sg",
    });

    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443), "Allow HTTPS");
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80), "Allow HTTP");

    // Restrict SSH access to EC2 Instance Connect service IP addresses for the region
    securityGroup.addIngressRule(
      Peer.ipv4("0.0.0.0/0"),
      Port.tcp(22),
      "Allow SSH from EC2 Instance Connect IPs",
    );

    // INFO: EC2 Instance
    const keyPair = new KeyPair(this, "NginxKeyPair", {
      keyPairName: "NginxKeyPair",
    });

    const ngnixScript = readFileSync(
      path.join(__dirname, "../scripts/nginx.sh"),
      "utf8",
    );

    // const neovimScript = readFileSync(
    //   path.join(__dirname, "../scripts/neovim.sh"),
    //   "utf8",
    // );

    const userData = UserData.forLinux();
    userData.addCommands(ngnixScript);
    // userData.addCommands(neovimScript);

    const role = new Role(this, "InstanceRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
      ],
    });

    const launchTemplate = new LaunchTemplate(this, "AppInstance", {
      instanceType: new InstanceType("t2.micro"),
      machineImage: new AmazonLinuxImage({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2023,
      }),
      role,
      securityGroup,
      userData,
      keyPair
    });

    new AutoScalingGroup(this, "AutoScalingGroup", {
      vpc,
      launchTemplate,
      desiredCapacity: 1,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
    });
  }
}
