export enum UIBranch {
    homepage = 1,
    apps = 2,
    application = 3,
    consulting = 4,
    libraries = 5,
    softwarepackage = 6,
    contact = 7,
    userprivacy = 8,
}

export const UIBranchText = new Map([
    [UIBranch.homepage, 'Homepage'],
    [UIBranch.apps, 'Mobile App'],
    [UIBranch.consulting, 'Consulting'],
    [UIBranch.libraries, 'Libraries'],
    [UIBranch.softwarepackage, 'Software Package'],
    [UIBranch.contact, 'Contact'],
    [UIBranch.application, 'Application'],
    [UIBranch.userprivacy, 'User Privacy'],
])