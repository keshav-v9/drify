import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Plus, 
  Copy, 
  UserPlus, 
  MessageSquare, 
  DollarSign,
  AlertTriangle,
  Heart,
  Stethoscope,
  Trash2,
  Crown,
  Shield,
  User as UserIcon,
  Eye
} from "lucide-react";
import { format } from "date-fns";

interface FamilyCollaborationProps {
  user: User | null;
}

interface FamilyGroup {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

interface FamilyMember {
  id: string;
  family_group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    email: string;
  };
}

interface FamilyUpdate {
  id: string;
  family_group_id: string;
  user_id: string;
  title: string;
  content: string;
  update_type: string;
  created_at: string;
  profiles?: {
    email: string;
  };
}

const updateTypeConfig = {
  general: { icon: MessageSquare, color: "bg-secondary text-muted-foreground", label: "General" },
  expense: { icon: DollarSign, color: "bg-green-100 text-success", label: "Expense" },
  care: { icon: Heart, color: "bg-pink-100 text-pink-700", label: "Care" },
  medical: { icon: Stethoscope, color: "bg-secondary text-primary", label: "Medical" },
  urgent: { icon: AlertTriangle, color: "bg-red-100 text-destructive", label: "Urgent" },
};

const roleConfig = {
  owner: { icon: Crown, color: "bg-yellow-100 text-warning", label: "Owner" },
  admin: { icon: Shield, color: "bg-secondary text-primary", label: "Admin" },
  member: { icon: UserIcon, color: "bg-secondary text-primary", label: "Member" },
  viewer: { icon: Eye, color: "bg-secondary text-muted-foreground", label: "Viewer" },
};

const FamilyCollaboration = ({ user }: FamilyCollaborationProps) => {
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<FamilyGroup | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [updates, setUpdates] = useState<FamilyUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [newUpdate, setNewUpdate] = useState({ title: "", content: "", type: "general" });

  useEffect(() => {
    if (user) {
      fetchFamilyGroups();
    }
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      fetchMembers();
      fetchUpdates();
    }
  }, [selectedGroup]);

  const fetchFamilyGroups = async () => {
    if (!user) return;
    
    try {
      // Get groups where user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('family_group_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const groupIds = memberData?.map(m => m.family_group_id) || [];

      if (groupIds.length > 0) {
        const { data: groups, error: groupsError } = await supabase
          .from('family_groups')
          .select('*')
          .in('id', groupIds);

        if (groupsError) throw groupsError;
        setFamilyGroups(groups || []);
        
        if (groups && groups.length > 0 && !selectedGroup) {
          setSelectedGroup(groups[0]);
        }
      } else {
        setFamilyGroups([]);
      }
    } catch (error) {
      console.error('Error fetching family groups:', error);
      toast.error('Failed to load family groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!selectedGroup) return;

    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_group_id', selectedGroup.id);

      if (error) throw error;

      // Fetch profile emails separately
      const memberData: FamilyMember[] = [];
      for (const member of data || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', member.user_id)
          .single();
        
        memberData.push({
          ...member,
          profiles: profile || undefined
        });
      }
      
      setMembers(memberData);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchUpdates = async () => {
    if (!selectedGroup) return;

    try {
      const { data, error } = await supabase
        .from('family_updates')
        .select('*')
        .eq('family_group_id', selectedGroup.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile emails separately
      const updateData: FamilyUpdate[] = [];
      for (const update of data || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', update.user_id)
          .single();
        
        updateData.push({
          ...update,
          profiles: profile || undefined
        });
      }
      
      setUpdates(updateData);
    } catch (error) {
      console.error('Error fetching updates:', error);
    }
  };

  const createFamilyGroup = async () => {
    if (!user || !newGroupName.trim()) return;

    try {
      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('family_groups')
        .insert({
          name: newGroupName.trim(),
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_group_id: group.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

      toast.success('Family group created!');
      setNewGroupName("");
      setShowCreateDialog(false);
      fetchFamilyGroups();
      setSelectedGroup(group);
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create family group');
    }
  };

  const joinFamilyGroup = async () => {
    if (!user || !joinCode.trim()) return;

    try {
      // Find the group by invite code
      const { data: group, error: groupError } = await supabase
        .from('family_groups')
        .select('*')
        .eq('invite_code', joinCode.trim().toLowerCase())
        .single();

      if (groupError || !group) {
        toast.error('Invalid invite code');
        return;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_group_id', group.id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        toast.error('You are already a member of this group');
        return;
      }

      // Join the group
      const { error: joinError } = await supabase
        .from('family_members')
        .insert({
          family_group_id: group.id,
          user_id: user.id,
          role: 'member'
        });

      if (joinError) throw joinError;

      toast.success(`Joined "${group.name}"!`);
      setJoinCode("");
      setShowJoinDialog(false);
      fetchFamilyGroups();
      setSelectedGroup(group);
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Failed to join family group');
    }
  };

  const copyInviteCode = () => {
    if (selectedGroup) {
      navigator.clipboard.writeText(selectedGroup.invite_code);
      toast.success('Invite code copied!');
    }
  };

  const postUpdate = async () => {
    if (!user || !selectedGroup || !newUpdate.title.trim() || !newUpdate.content.trim()) return;

    try {
      const { error } = await supabase
        .from('family_updates')
        .insert({
          family_group_id: selectedGroup.id,
          user_id: user.id,
          title: newUpdate.title.trim(),
          content: newUpdate.content.trim(),
          update_type: newUpdate.type
        });

      if (error) throw error;

      toast.success('Update posted!');
      setNewUpdate({ title: "", content: "", type: "general" });
      setShowUpdateDialog(false);
      fetchUpdates();
    } catch (error) {
      console.error('Error posting update:', error);
      toast.error('Failed to post update');
    }
  };

  const deleteUpdate = async (updateId: string) => {
    try {
      const { error } = await supabase
        .from('family_updates')
        .delete()
        .eq('id', updateId);

      if (error) throw error;
      toast.success('Update deleted');
      fetchUpdates();
    } catch (error) {
      console.error('Error deleting update:', error);
      toast.error('Failed to delete update');
    }
  };

  const leaveGroup = async () => {
    if (!user || !selectedGroup) return;

    const isOwner = members.find(m => m.user_id === user.id)?.role === 'owner';
    if (isOwner) {
      toast.error('Owners cannot leave. Transfer ownership or delete the group.');
      return;
    }

    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('family_group_id', selectedGroup.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Left the group');
      setSelectedGroup(null);
      fetchFamilyGroups();
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  // No groups state
  if (familyGroups.length === 0) {
    return (
      <Card className="border-2 border-dashed border-border">
        <CardContent className="p-12 text-center">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Family Groups Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create a family group to collaborate with your loved ones on caregiving and finances.
          </p>
          <div className="flex gap-4 justify-center">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Family Group</DialogTitle>
                  <DialogDescription>
                    Create a new group to collaborate with family members.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="groupName">Group Name</Label>
                    <Input
                      id="groupName"
                      placeholder="e.g., Smith Family Care Team"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                    />
                  </div>
                  <Button onClick={createFamilyGroup} className="w-full">
                    Create Group
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Join Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join Family Group</DialogTitle>
                  <DialogDescription>
                    Enter the invite code shared by a family member.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="inviteCode">Invite Code</Label>
                    <Input
                      id="inviteCode"
                      placeholder="Enter 8-character code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                    />
                  </div>
                  <Button onClick={joinFamilyGroup} className="w-full">
                    Join Group
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Group Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select
            value={selectedGroup?.id || ""}
            onValueChange={(value) => {
              const group = familyGroups.find(g => g.id === value);
              setSelectedGroup(group || null);
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a group" />
            </SelectTrigger>
            <SelectContent>
              {familyGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Family Group</DialogTitle>
                <DialogDescription>
                  Create a new group to collaborate with family members.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="groupName2">Group Name</Label>
                  <Input
                    id="groupName2"
                    placeholder="e.g., Smith Family Care Team"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>
                <Button onClick={createFamilyGroup} className="w-full">
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Join
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join Family Group</DialogTitle>
                <DialogDescription>
                  Enter the invite code shared by a family member.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="inviteCode2">Invite Code</Label>
                  <Input
                    id="inviteCode2"
                    placeholder="Enter 8-character code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                  />
                </div>
                <Button onClick={joinFamilyGroup} className="w-full">
                  Join Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {selectedGroup && (
        <Tabs defaultValue="updates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="updates" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Updates
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members ({members.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="updates" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Family Updates</h3>
              <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Post Update
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Post Update</DialogTitle>
                    <DialogDescription>
                      Share an update with your family group.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="updateTitle">Title</Label>
                      <Input
                        id="updateTitle"
                        placeholder="Update title"
                        value={newUpdate.title}
                        onChange={(e) => setNewUpdate(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="updateType">Type</Label>
                      <Select
                        value={newUpdate.type}
                        onValueChange={(value) => setNewUpdate(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(updateTypeConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <config.icon className="h-4 w-4" />
                                {config.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="updateContent">Content</Label>
                      <Textarea
                        id="updateContent"
                        placeholder="Share your update..."
                        value={newUpdate.content}
                        onChange={(e) => setNewUpdate(prev => ({ ...prev, content: e.target.value }))}
                        rows={4}
                      />
                    </div>
                    <Button onClick={postUpdate} className="w-full">
                      Post Update
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {updates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No updates yet. Be the first to post!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {updates.map((update) => {
                  const typeConfig = updateTypeConfig[update.update_type as keyof typeof updateTypeConfig] || updateTypeConfig.general;
                  const TypeIcon = typeConfig.icon;
                  const isAuthor = update.user_id === user?.id;

                  return (
                    <Card key={update.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className={typeConfig.color}>
                              <TypeIcon className="h-3 w-3 mr-1" />
                              {typeConfig.label}
                            </Badge>
                            <CardTitle className="text-lg">{update.title}</CardTitle>
                          </div>
                          {isAuthor && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteUpdate(update.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <CardDescription>
                          {update.profiles?.email || 'Unknown'} • {format(new Date(update.created_at), 'MMM d, yyyy h:mm a')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground whitespace-pre-wrap">{update.content}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Family Members</CardTitle>
                <CardDescription>People who have access to this group</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map((member) => {
                    const role = roleConfig[member.role as keyof typeof roleConfig] || roleConfig.member;
                    const RoleIcon = role.icon;

                    return (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{member.profiles?.email || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">
                              Joined {format(new Date(member.joined_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <Badge className={role.color}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {role.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Invite Members</CardTitle>
                <CardDescription>Share this code with family members to invite them</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1 p-4 bg-secondary rounded-lg font-mono text-2xl text-center tracking-wider">
                    {selectedGroup.invite_code.toUpperCase()}
                  </div>
                  <Button onClick={copyInviteCode} variant="outline">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={leaveGroup}>
                  Leave Group
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default FamilyCollaboration;
