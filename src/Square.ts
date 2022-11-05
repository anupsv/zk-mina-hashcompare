import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Poseidon,
  Permissions,
} from 'snarkyjs';

export class Square extends SmartContract {
  @state(Field) num = State<Field>();
  @state(Field) secret = State<Field>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
  }

  @method init() {
    this.num.set(Field(3));
  }

  @method update(salt: Field, firstSecret: Field) {
    const currentState = this.num.get();
    this.num.assertEquals(currentState);
    this.secret.set(Poseidon.hash([salt, firstSecret]));
  }

  @method verify(salt: Field,userInput: Field ){
    this.secret.assertEquals(this.secret.get());
    try{
    Poseidon.hash([salt,userInput]).assertEquals(this.secret.get());
    } catch(ex){
      console.log(ex);
    }
    this.num.set(Field(133713371337));
    
  }
}
