import { Injectable } from '@angular/core'
import { AngularFireAuth } from '@angular/fire/auth'
import { User as FirebaseUser } from 'firebase'
import { Observable, Subject } from 'rxjs'
import { map } from 'rxjs/operators'

import { IUser, User } from '../user/user/user'
import { Role } from './auth.enum'
import {
  AuthService,
  IAuthStatus,
  IServerAuthResponse,
  defaultAuthStatus,
} from './auth.service'

interface IJwtToken {
  email: string
  iat: number
  exp: number
  sub: string
}

@Injectable()
export class FirebaseAuthService extends AuthService {
  constructor(private afAuth: AngularFireAuth) {
    super()
  }

  protected authProvider(
    email: string,
    password: string
  ): Observable<IServerAuthResponse> {
    const serverResponse$ = new Subject<IServerAuthResponse>()

    this.afAuth.signInWithEmailAndPassword(email, password).then(
      res => {
        const firebaseUser: FirebaseUser = res.user
        firebaseUser.getIdToken().then(
          token => serverResponse$.next({ accessToken: token } as IServerAuthResponse),
          err => serverResponse$.error(err)
        )
      },
      err => serverResponse$.error(err)
    )

    return serverResponse$
  }

  protected transformJwtToken(token: IJwtToken): IAuthStatus {
    if (!token) {
      return defaultAuthStatus
    }

    return {
      isAuthenticated: token.email ? true : false,
      userId: token.sub,
      userRole: Role.None,
    }
  }

  protected getCurrentUser(): Observable<User> {
    return this.afAuth.user.pipe(map(this.transformFirebaseUser))
  }

  transformFirebaseUser(firebaseUser: FirebaseUser): User {
    if (!firebaseUser) {
      return new User()
    }

    return User.Build({
      name: {
        first: firebaseUser.displayName
          ? firebaseUser.displayName.split(' ')[0]
          : 'Firebase',
        last: firebaseUser.displayName ? firebaseUser.displayName.split(' ')[1] : 'User',
      },
      picture: firebaseUser.photoURL,
      email: firebaseUser.email,
      _id: firebaseUser.uid,
      role: Role.None,
    } as IUser)
  }

  logout() {
    if (this.afAuth) {
      this.afAuth.signOut()
    }
    this.clearToken()
    this.authStatus$.next(defaultAuthStatus)
  }
}
